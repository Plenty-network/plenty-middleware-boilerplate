const express = require("express");
const fs = require("fs");
const config = require("./config");
require("./src/request_handler").startRequestHandler();

const app = express();

app.get("/tokens_statistical_data", async function (req, res) {
  const data = fs.readFileSync("tokens_statistical_data.json");
  res.json(JSON.parse(data));
});

app.get("/tokens_price_scatter", async function (req, res) {
  const data = fs.readFileSync("tokens_price_scatter.json");
  res.json(JSON.parse(data));
});

app.listen(config.PORT);
