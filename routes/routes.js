const express = require("express");
const { Service } = require("../services");
const { BadRequestError } = require("../utils/errors");

const router = express.Router();
const service = new Service();

router.get("/", (req, res) => {
  res.json({ message: "Welcome to the users API" });
});



module.exports = router;
