const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const userController = require("../controllers/user.controller");

const router = express.Router();

// All routes here require authentication
router.use(authMiddleware);

// Get current user profile
router.get("/me", userController.getMe);

// Update user profile
router.put("/update", userController.updateProfile);

// Discover users with filters
router.get("/discover", userController.discoverUsers);

// Block a user
router.post("/block/:id", userController.blockUser);

// Report a user
router.post("/report", userController.reportUser);

module.exports = router;
