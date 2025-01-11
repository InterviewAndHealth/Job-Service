const { EXCHANGE_NAME, SERVICE_QUEUE } = require("../../config");
const Broker = require("./broker");

class EventService {
  static pulishChannelWrapper = null;

  static async #getPublishChannelWrapper() {
    if (!this.pulishChannelWrapper) {
      const connection = await Broker.connect();
      this.pulishChannelWrapper = connection.createChannel({
        name: "job-events-publisher",
        json: true,
        setup(channel) {
          return channel.assertExchange(EXCHANGE_NAME, "direct", {
            durable: true,
          });
        },
      });
    }
    return this.pulishChannelWrapper;
  }

  static async publish(service, data) {
    const channelWrapper = await this.#getPublishChannelWrapper();
    channelWrapper
      .publish(EXCHANGE_NAME, service, data, { persistent: true })
      .catch((err) => {
        console.error("Failed to publish event", err.stack);
      });
  }

  static async subscribe(service, subscriber) {
    const connection = await Broker.connect();
    const onMessage = async (data) => {
      if (data.content) {
        try {
          const message = JSON.parse(data.content.toString());
          await subscriber.handleEvent(message);
          channelWrapper.ack(data);
        } catch (err) {
          console.error("Error handling event", err);
          channelWrapper.nack(data);
        }
      }
    };

    const channelWrapper = connection.createChannel({
      name: "job-events-subscriber",
      json: true,
      setup(channel) {
        return Promise.all([
          channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true }),
          channel.assertQueue(SERVICE_QUEUE, {
            durable: true,
            arguments: { "x-queue-type": "quorum" },
          }),
          channel.bindQueue(SERVICE_QUEUE, EXCHANGE_NAME, service),
          channel.prefetch(1),
          channel.consume(SERVICE_QUEUE, onMessage, { noAck: false }),
        ]);
      },
    });

    channelWrapper
      .waitForConnect()
      .then(function () {
        console.log("Listening for events from service:", service);
      })
      .catch(function (err) {
        console.error("Failed to subscribe to service", err);
      });
  }
}

module.exports = EventService;
