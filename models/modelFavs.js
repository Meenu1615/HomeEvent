const mongoose = require("mongoose");

const favsSchema = new mongoose.Schema(
  {
    citizenemail: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    vendoremails: [{ type: String, lowercase: true, trim: true }],
  },
  { timestamps: true, collection: "favs" },
);

module.exports = mongoose.model("favs", favsSchema);
