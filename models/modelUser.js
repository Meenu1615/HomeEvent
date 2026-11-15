const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    emailid: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    utype: {
      type: String,
      enum: ["User", "Vendor","Admin"],
      default: "User",
      required: true,
    },

    status: {
      type: String,
      enum: ["Active", "Inactive"],
      default: "Active",
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model("User", userSchema, "users");
