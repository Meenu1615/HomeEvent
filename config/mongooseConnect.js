var mongoose = require("mongoose");

async function doMongooseConnection() {
  try {
    await mongoose.connect(process.env.ATLAS_URL);

    console.log("MongoDB Connected Successfully!");
  } catch (err) {
    console.log("MongoDB Connection Failed:", err.message);
  }
}

module.exports = { doMongooseConnection };
