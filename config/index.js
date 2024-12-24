const dotEnv = require("dotenv");
const { EVENT_TYPES, RPC_TYPES } = require("./types");

dotEnv.config();

module.exports = {
  PORT: process.env.PORT || 8000,
  APP_SECRET: process.env.APP_SECRET,

  POSTGRES_USERNAME: process.env.POSTGRES_USERNAME,
  POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
  POSTGRES_HOST: process.env.POSTGRES_HOST,
  POSTGRES_PORT: process.env.POSTGRES_PORT,
  DATABASE_URL:
    process.env.DATABASE_URL ||
    `postgresql://${process.env.POSTGRES_USERNAME}:${process.env.POSTGRES_PASSWORD}@${process.env.POSTGRES_HOST}:${process.env.POSTGRES_PORT}`,
  DATABASE_NAME: process.env.DATABASE_NAME || process.env.JOB_SERVICE_DB,

  RABBITMQ_USERNAME: process.env.RABBITMQ_USERNAME,
  RABBITMQ_PASSWORD: process.env.RABBITMQ_PASSWORD,
  RABBITMQ_HOST: process.env.RABBITMQ_HOST,
  RABBITMQ_PORT: process.env.RABBITMQ_PORT,
  RABBITMQ_URL:
    process.env.RABBITMQ_URL ||
    `amqp://${process.env.RABBITMQ_USERNAME}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`,

  EXCHANGE_NAME: process.env.EXCHANGE_NAME,
  SERVICE_NAME: process.env.SERVICE_NAME || "JOB_SERVICE",
  SERVICE_QUEUE: process.env.SERVICE_QUEUE || process.env.JOB_QUEUE,
  RPC_QUEUE: process.env.RPC_QUEUE || process.env.JOB_RPC,

  TEST_QUEUE: process.env.TEST_QUEUE,
  TEST_RPC: process.env.TEST_RPC,
  USERS_QUEUE: process.env.USER_QUEUE,
  USERS_RPC: process.env.USER_RPC,
  EVENT_TYPES,
  RPC_TYPES,
  JWT_SECRET_KEY: process.env.JWT_SECRET_KEY,
};
