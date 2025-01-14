const { EXCHANGE_NAME, SERVICE_QUEUE } = require("../../config");
const Broker = require("./broker");

class EventService {
  static publishChannelWrapper = null;

  static async #getPublishChannelWrapper() {
    if (!this.publishChannelWrapper) {
      const connection = await Broker.connect();
      this.publishChannelWrapper = connection.createChannel({
        name: `${SERVICE_QUEUE}-events-publisher`,
        json: true,
        setup(channel) {
          return channel.assertExchange(EXCHANGE_NAME, "direct", {
            durable: true,
          });
        },
      });
    }
    return this.publishChannelWrapper;
  }

  static async publish(service, data) {
    const channelWrapper = await this.#getPublishChannelWrapper();
    channelWrapper
      .publish(EXCHANGE_NAME, service, data, { persistent: true })
      .catch((err) => {
        console.error("Failed to publish event", err);
      });
  }

  static async subscribe(service, subscriber) {
    const connection = await Broker.connect();

    const setupChannel = async (channel) => {
      await channel.assertExchange(EXCHANGE_NAME, "direct", { durable: true });
      await channel.assertQueue(SERVICE_QUEUE, {
        durable: true,
        arguments: { "x-queue-type": "quorum" },
      });
      await channel.bindQueue(SERVICE_QUEUE, EXCHANGE_NAME, service);
      await channel.consume(
        SERVICE_QUEUE,
        async (data) => {
          if (data.content) {
            try {
              const message = JSON.parse(data.content.toString());
              await subscriber.handleEvent(message);
              channel.ack(data);
            } catch (err) {
              console.error("Error handling event", err);
              channel.nack(data);
            }
          }
        },
        { noAck: false }
      );
    };

    const channelWrapper = connection.createChannel({
      name: `${SERVICE_QUEUE}-events-subscriber`,
      json: true,
      setup: setupChannel,
    });

    channelWrapper.addSetup((channel) => {
      return channel.prefetch(1);
    });

    // Rebind on reconnect
    connection.on("connect", async () => {
      console.log("Binding queues...");
      await setupChannel(channelWrapper);
    });

    channelWrapper
      .waitForConnect()
      .then(() => console.log(`Listening for events from service ${service}`))
      .catch((err) => console.error("Failed to subscribe to service", err));
  }
}

module.exports = EventService;
