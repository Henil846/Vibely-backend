const express = require("express");
const { authMiddleware } = require("../middleware/auth.middleware");
const socialController = require("../controllers/social.controller");

const router = express.Router();

// All social routes require authentication
router.use(authMiddleware);

// Search users by username
router.get("/search", socialController.searchUsers);

// ─── Friend Requests ────────────────────────────────────
router.post("/friend-request/send/:id", socialController.sendFriendRequest);
router.post("/friend-request/accept/:requestId", socialController.acceptFriendRequest);
router.post("/friend-request/reject/:requestId", socialController.rejectFriendRequest);
router.post("/friend-request/cancel/:requestId", socialController.cancelFriendRequest);
router.get("/friend-requests/received", socialController.getReceivedFriendRequests);
router.get("/friend-requests/sent", socialController.getSentFriendRequests);
router.get("/friends", socialController.getFriends);
router.post("/unfriend/:id", socialController.unfriend);

// ─── Follow System ──────────────────────────────────────
router.post("/follow/:id", socialController.followUser);
router.post("/unfollow/:id", socialController.unfollowUser);
router.post("/follow-request/accept/:requestId", socialController.acceptFollowRequest);
router.post("/follow-request/reject/:requestId", socialController.rejectFollowRequest);
router.get("/follow-requests", socialController.getFollowRequests);
router.get("/followers", socialController.getFollowers);
router.get("/following", socialController.getFollowing);

// Relationship status with a specific user
router.get("/status/:id", socialController.getRelationshipStatus);

module.exports = router;
