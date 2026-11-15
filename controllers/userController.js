const User = require("../models/modelUser");
const md5 = require("md5");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Welcome Email
async function sendWelcomeEmail(emailid) {
  try {
    if (!process.env.MAIL_USER || !process.env.MAIL_PASS) {
      console.log("Email credentials not configured");
      return false;
    }

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: process.env.MAIL_USER,
        pass: process.env.MAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.MAIL_USER,
      to: emailid,
      subject: "Welcome to Home Event Management",
      text: "Welcome! Your account has been created successfully.",
    });

    return true;
  } catch (error) {
    console.log("Email Error:", error.message);
    return false;
  }
}

// SIGNUP
const doSignup = async (req, res) => {
  try {
    const { emailid, password, utype } = req.body;

    if (!emailid || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const existingUser = await User.findOne({ emailid });

    if (existingUser) {
      return res.status(409).json({
        message: "Email already registered",
      });
    }

    // Public signup must not allow Admin registration
    const role = utype === "Vendor" ? "Vendor" : "User";

    const hashedPassword = md5(password);

    const newUser = new User({
      emailid,
      password: hashedPassword,
      utype: role,
      status: "Active",
    });

    await newUser.save();

    const emailSent = await sendWelcomeEmail(emailid);

    return res.status(201).json({
      message: "Signup successful",
      emailSent,
      user: {
        emailid: newUser.emailid,
        utype: newUser.utype,
        status: newUser.status,
      },
    });
  } catch (error) {
    console.log("SIGNUP ERROR:", error);

    return res.status(500).json({
      message: "Signup failed",
      error: error.message,
    });
  }
};

// LOGIN
const doLogin = async (req, res) => {
  try {
    const { emailid, password } = req.body;

    if (!emailid || !password) {
      return res.status(400).json({
        message: "Email and password are required",
      });
    }

    const user = await User.findOne({ emailid }).select("+password");

    if (!user) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    // Password verification
    if (user.password !== md5(password)) {
      return res.status(401).json({
        message: "Invalid email or password",
      });
    }

    if (user.status !== "Active") {
      return res.status(403).json({
        message: "Your account is not active",
      });
    }

    if (!process.env.JWT_SECRET) {
      console.log("JWT_SECRET missing in .env");

      return res.status(500).json({
        message: "JWT configuration error",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      {
        id: user._id,
        emailid: user.emailid,
        utype: user.utype,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN || "1d",
      },
    );

    console.log("JWT TOKEN GENERATED SUCCESSFULLY");

    return res.status(200).json({
      message: "Login successful",
      token,
      user: {
        _id: user._id,
        emailid: user.emailid,
        utype: user.utype,
        status: user.status,
      },
    });
  } catch (error) {
    console.log("LOGIN ERROR:", error);

    return res.status(500).json({
      message: "Login failed",
      error: error.message,
    });
  }
};

module.exports = {
  doSignup,
  doLogin,
};
