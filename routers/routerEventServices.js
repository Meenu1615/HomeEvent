const express = require("express");

const {
  doGiveServices,
  doFetchCities,
  doGiveVendorDetails,
} = require("../controllers/controllerEventServices");

const app = express.Router();

app.post("/eventSerFetch", doGiveServices);
app.post("/eventCityFetch", doFetchCities);
app.post("/eventVendorDetails", doGiveVendorDetails);

module.exports = app;
