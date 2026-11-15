const mongoose = require("mongoose");

const citizenSchema = new mongoose.Schema(
  {
    emailid: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    acardno: { type: String, default: "" },
    name: { type: String, default: "" },
    dob: { type: String, default: "" },
    gender: { type: String, default: "" },
    address: { type: String, default: "" },
    city: { type: String, default: "" },
    contact: { type: String, default: "" },
  },
  { timestamps: true },
);

module.exports = mongoose.model("Citizen", citizenSchema);
