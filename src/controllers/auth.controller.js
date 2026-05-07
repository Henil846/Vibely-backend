const User = require("../models/user.model");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const { sendOTP, verifyOTP } = require("../services/otp.service");

// POST /api/auth/send-otp — Send OTP to email
async function sendEmailOTP(req, res) {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    // Check if email is already registered
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({
        message: "This email is already registered.",
        code: "auth/email-already-in-use",
      });
    }

    await sendOTP(email);

    return res.status(200).json({
      message: "OTP sent successfully to your email.",
      sentVia: process.env.GMAIL_USER ? process.env.GMAIL_USER.substring(0, 5) + "***" : "NO_GMAIL_USER_SET",
    });
  } catch (err) {
    console.error("Send OTP error:", err);
    return res.status(500).json({
      message: "Failed to send OTP: " + err.message,
    });
  }
}

// POST /api/auth/verify-otp — Verify the OTP
async function verifyEmailOTP(req, res) {
  try {
    const { email, otp } = req.body;

    if (!email || !otp) {
      return res.status(400).json({ message: "Email and OTP are required" });
    }

    const result = verifyOTP(email, otp);

    if (!result.valid) {
      return res.status(400).json({
        message: result.message,
        code: "auth/invalid-otp",
      });
    }

    return res.status(200).json({
      message: result.message,
      verified: true,
    });
  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "Verification failed" });
  }
}

// POST /api/auth/register — Register user (after OTP verification)
async function registerUser(req, res) {
  try {
    const {
      fullname,
      displayName,
      username,
      email,
      phone,
      password,
      age,
      gender,
      preferredGender,
      talk_with,
      city,
      state,
      region,
      bio,
      profilePhoto,
      interests,
    } = req.body;

    // Check if email already exists
    const isEmailTaken = await User.findOne({ email: email.toLowerCase() });
    if (isEmailTaken) {
      return res.status(409).json({
        message: "This email is already registered.",
        code: "auth/email-already-in-use",
      });
    }

    // Check if phone already exists
    const isPhoneTaken = await User.findOne({ phone });
    if (isPhoneTaken) {
      return res.status(409).json({
        message: "This phone number is already registered.",
        code: "auth/phone-already-in-use",
      });
    }

    // Check if username is taken
    const isUsernameTaken = await User.findOne({ username: username.toLowerCase() });
    if (isUsernameTaken) {
      return res.status(409).json({
        message: "Username is already taken.",
        code: "auth/username-taken",
      });
    }

    const hash = await bcrypt.hash(password, 10);

    const user = await User.create({
      fullname: fullname || displayName || "",
      displayName: displayName || fullname || "",
      email,
      phone,
      username,
      password: hash,
      age,
      gender,
      talk_with: talk_with || preferredGender || "everyone",
      city: city || "",
      state: state || region || "",
      bio: bio || "",
      profilePhoto: profilePhoto || "",
      interests: interests || [],
    });

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      sameSite: "lax",
    });

    // Return user without password
    const userObj = user.toJSON();
    delete userObj.password;

    res.status(201).json({
      message: "User Registered Successfully.",
      user: userObj,
      token,
    });
  } catch (err) {
    console.error("Register error:", err);
    return res.status(500).json({
      message: err.message,
    });
  }
}

async function loginUser(req, res) {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email: email.toLowerCase() });

    if (!user) {
      return res
        .status(401)
        .json({ message: "Invalid email or password", code: "auth/invalid-credential" });
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res
        .status(401)
        .json({
          message: "Invalid email or password",
          code: "auth/invalid-credential",
        });
    }

    // Set user online
    user.isOnline = true;
    await user.save();

    const token = jwt.sign(
      {
        id: user._id,
        email: user.email,
      },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    res.cookie("token", token, {
      httpOnly: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
      sameSite: "lax",
    });

    // Return user without password
    const userObj = user.toJSON();
    delete userObj.password;

    return res.status(200).json({
      message: "User logged in successfully",
      user: userObj,
      token,
    });
  } catch (err) {
    console.error("Login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

async function logoutUser(req, res) {
  try {
    // Set user offline if authenticated
    if (req.user) {
      await User.findByIdAndUpdate(req.user.id, { isOnline: false });
    }
    res.clearCookie("token");
    res.status(200).json({
      message: "User logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.clearCookie("token");
    res.status(200).json({ message: "Logged out" });
  }
}

module.exports = { sendEmailOTP, verifyEmailOTP, registerUser, loginUser, logoutUser };