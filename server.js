const express = require("express");
const path = require("path");
const cors = require("cors");
const fileUpload = require("express-fileupload");

require("dotenv").config({
  path: path.join(__dirname, ".env"),
});
console.log("JWT SECRET LOADED:", Boolean(process.env.JWT_SECRET));

// if (!process.env.JWT_SECRET) {
//   throw new Error("JWT_SECRET is missing in .env file");
// }
const app = express();

// Middleware
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  }),
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(
  fileUpload({
    useTempFiles: false,
    createParentPath: true,
    limits: {
      fileSize: 10 * 1024 * 1024,
    },
  }),
);

// Routers
const userRouter = require("./routers/routerUser");
const vendorRouter = require("./routers/routerVendor");
const citizenRouter = require("./routers/routerCitizen");
const eventServicesRouter = require("./routers/routerEventServices");
const favsRouter = require("./routers/routerFavs");

// Database
const { doMongooseConnection } = require("./config/mongooseConnect");

// Static files
app.use("/uploads", express.static(path.join(__dirname, "uploads")));

// API routes
// app.use("/user", userRouter);
app.use("/", userRouter);
app.use("/vendor", vendorRouter);
app.use("/citizen", citizenRouter);
app.use("/eventServices", eventServicesRouter);
app.use("/favs", favsRouter);

// Test route
app.get("/", (req, res) => {
  res.status(200).send("Backend is running successfully!");
});

// Start server
const PORT = 2005;

async function startServer() {
  try {
    await doMongooseConnection();

    app.listen(PORT, () => {
      console.log(`Server Started on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Database connection failed:", error);
  }
}

startServer();
