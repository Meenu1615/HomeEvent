
const mongoose = require("mongoose");

const eventSchema = new mongoose.Schema(
  {
    event: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    services: {
      type: [String],
      required: true,
    },
  },
  {
    versionKey: false,
    collection: "event_services",
  }
);

const EventColRef = mongoose.model(
  "EventService",
  eventSchema
);

module.exports = EventColRef;
