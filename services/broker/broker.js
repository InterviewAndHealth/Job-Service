var amqp = require("amqp-connection-manager");
const { RABBITMQ_URL } = require("../../config");

class Broker {
  static #connection;

  /**
   * Connect to RabbitMQ
   * @returns {Promise} - A promise that resolves to a RabbitMQ connection
   * @throws {Error} - If RabbitMQ connection fails
   */
  static async connect() {
    try {
      if (this.#connection) return this.#connection;
      const connection = amqp.connect([RABBITMQ_URL]);

      connection.on("connect", () => console.log("Connected to RabbitMQ"));
      connection.on("disconnect", (err) =>
        console.log("Disconnected from RabbitMQ", err)
      );
      connection.on("blocked", (reason) =>
        console.log("RabbitMQ connection blocked", reason)
      );
      connection.on("unblocked", () =>
        console.log("RabbitMQ connection unblocked")
      );

      this.#connection = connection;
      return connection;
    } catch (err) {
      console.error("Failed to connect to RabbitMQ", err);
    }
  }

  /**
   * Close RabbitMQ connection
   */
  static async close() {
    console.log("Closing RabbitMQ connection");
    if (this.#connection) {
      await this.#connection.close();
      this.#connection = null;
    }
  }
}

module.exports = Broker;
