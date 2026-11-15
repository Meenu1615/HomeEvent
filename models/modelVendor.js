const mongoose = require("mongoose");

const vendorSchema = new mongoose.Schema(
  {
    emailid: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    contact: {
      type: String,
      required: true,
      trim: true,
    },
    business: {
      type: String,
      required: true,
      trim: true,
    },
    area: {
      type: String,
      default: "",
    },
    address: {
      type: String,
      default: "",
    },
    city: {
      type: String,
      default: "",
    },
    estd: {
      type: String,
      default: "",
    },
    selcate: {
      type: String,
      default: "",
    },
    website: {
      type: String,
      default: "",
    },
    insta: {
      type: String,
      default: "",
    },
    shoppicurl: {
      type: String,
      default: "",
    },
    certpicurl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("vendors", vendorSchema);
