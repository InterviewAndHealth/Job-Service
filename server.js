const express = require("express");
require("express-async-errors");
const cors = require("cors");
const error = require("./middlewares/error");
const routes = require("./routes/routes");
const { DB } = require("./database");
var bodyParser = require("body-parser");
const { JobsService } = require("./services/rpcandeventservice");
const RPCService = require("./services/broker/rpc");
const EventService = require("./services/broker/events");
const { SERVICE_QUEUE } = require("./config/index");

const multer = require("multer");

const upload = multer();
module.exports = async (app) => {
  await DB.connect();

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(bodyParser.urlencoded({ extended: false }));
  app.use(cors());
  app.use(routes);
  app.use(error);
  app.use(upload.array());



  const jobsservice = new JobsService();
await RPCService.respond(jobsservice);
await EventService.subscribe(SERVICE_QUEUE, jobsservice);
};


