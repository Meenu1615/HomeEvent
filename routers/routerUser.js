const express = require("express");
const router = express.Router();

const { doSignup, doLogin } = require("../controllers/userController");

const verifyToken = require("../middleware/authMiddleware");

// Signup API
router.post("/signup", doSignup);

// Login API
router.post("/login", doLogin);

// Test API
router.get("/test", (req, res) => {
  res.status(200).json({
    success: true,
    message: "User router is working!",
  });
});

// Protected profile API
router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json({
    message: "User authenticated successfully",
    user: req.user,
  });
});

module.exports = router;
