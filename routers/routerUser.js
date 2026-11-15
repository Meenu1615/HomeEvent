const express = require("express");
const router = express.Router();

const { doSignup, doLogin } = require("../controllers/userController");

const verifyToken = require("../middleware/authMiddleware");

router.post("/signup", doSignup);
router.post("/login", doLogin);

// Protected profile API
router.get("/profile", verifyToken, (req, res) => {
  res.status(200).json({
    message: "User authenticated successfully",
    user: req.user,
  });
});

module.exports = router;
