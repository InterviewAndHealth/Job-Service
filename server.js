const express = require("express");
require("express-async-errors");
const cors = require("cors");
const error = require("./middlewares/error");
const routes = require("./routes/routes");
const { DB } = require("./database");

const { JobsService } = require("./services/rpcandeventservice");
const RPCService = require("./services/broker/rpc");
const EventService = require("./services/broker/events");
const { SERVICE_QUEUE } = require("./config/index");

module.exports = async (app) => {
  await DB.connect();

  app.use(express.json());
  app.use(cors());
  app.use(routes);
  app.use(error);
};


const jobsservice = new JobsService();
await RPCService.respond(jobsservice);
await EventService.subscribe(SERVICE_QUEUE, interviewservice);