const express = require("express");
const authController = require("../controllers/auth.controller");
const { authMiddleware, optionalAuth } = require("../middleware/auth.middleware");
const router = express.Router();

// OTP routes (public)
router.post("/send-otp", authController.sendEmailOTP);
router.post("/verify-otp", authController.verifyEmailOTP);

// Auth routes
router.post("/register", authController.registerUser);
router.post("/login", authController.loginUser);
router.post("/logout", optionalAuth, authController.logoutUser);

module.exports = router;