const { nanoid } = require("nanoid");
const Broker = require("./broker");
const { RPC_QUEUE } = require("../../config");

class RPCService {
  /**
   * Request a data from a service
   * @param {string} service_rpc - The service rpc to request data from
   * @param {object} request_payload - The request payload
   * @param {number} timeout_ms - The request timeout in milliseconds
   * @returns {Promise} - A promise that resolves when the request is successful
   * @throws {Error} - If request fails
   * @example
   * await RPCService.request('INTERVIEW_SERVICE', {
   *    type: 'GET_INTERVIEW',
   *    data: {
   *        interviewId: 1,
   *    },
   * });
   */
  static async request(service_rpc, request_payload, timeout_ms = 10000) {
    try {
      const id = nanoid();

      const connection = await Broker.connect();
      const channel = connection.createChannel({
        name: `${service_rpc}-rpc-requester`,
        setup(channel) {
          return Promise.resolve(channel);
        },
        confirm: false,
      });
      await channel.waitForConnect();
      const queue = await channel.assertQueue("", { exclusive: true });

      channel.sendToQueue(
        service_rpc,
        Buffer.from(JSON.stringify(request_payload)),
        {
          replyTo: queue.queue,
          correlationId: id,
        }
      );

      return new Promise((resolve, reject) => {
        const timeout = setTimeout(async () => {
          try {
            await channel.deleteQueue(queue.queue);
            await channel.close();
            reject("Request timed out");
          } catch (err) {
            console.error(`Failed to delete queue: ${err.message}`);
            reject("Request timed out with cleanup error");
          }
        }, timeout_ms);

        const consumerTagPromise = channel.consume(
          queue.queue,
          async (data) => {
            if (data.properties.correlationId === id) {
              clearTimeout(timeout);
              resolve(JSON.parse(data.content.toString()));
              await channel.cancel(data.fields.consumerTag);
              await channel.deleteQueue(queue.queue);
              await channel.close();
            }
          },
          { noAck: true }
        );

        consumerTagPromise.catch((err) => {
          clearTimeout(timeout);
          console.error(`Failed to consume queue: ${err.message}`);
          reject("Consumer setup failed");
        });
      });
    } catch (err) {
      console.error("Failed to request data:", err);
      throw err;
    }
  }

  /**
   * Respond to a request from a service
   * @param {function} responder - Service to respond to requests with function `respondRPC` to handle requests
   * @returns {Promise} - A promise that resolves when the response is successful
   * @throws {Error} - If response fails
   * @example
   * await RPCService.respond(Service);
   */
  static async respond(responder) {
    try {
      const connection = await Broker.connect();

      const onMessage = async (data) => {
        if (data.content) {
          const message = JSON.parse(data.content.toString());
          const response = await responder.respondRPC(message);
          channelWrapper.sendToQueue(
            data.properties.replyTo,
            Buffer.from(JSON.stringify(response)),
            {
              correlationId: data.properties.correlationId,
            }
          );
          channelWrapper.ack(data);
        }
      };

      const channelWrapper = connection.createChannel({
        name: `${RPC_QUEUE}-rpc-responder`,
        setup(channel) {
          return Promise.all([
            channel.assertQueue(RPC_QUEUE, {
              durable: false,
              autoDelete: true,
            }),
            channel.prefetch(1),
            channel.consume(RPC_QUEUE, onMessage, { noAck: false }),
          ]);
        },
      });

      channelWrapper
        .waitForConnect()
        .then(() => console.log("Responding to RPC requests:", RPC_QUEUE))
        .catch((err) => console.error("Failed to connect RPC responder", err));
    } catch (err) {
      console.log("Failed to respond to request");
    }
  }
}

module.exports = RPCService;
