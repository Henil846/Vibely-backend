const User = require("../models/user.model");
const FriendRequest = require("../models/friendRequest.model");
const FollowRequest = require("../models/followRequest.model");

// ─── SEARCH ──────────────────────────────────────────────

// GET /api/social/search?username=xxx
async function searchUsers(req, res) {
  try {
    const { username } = req.query;
    if (!username || username.trim().length < 2) {
      return res.status(400).json({ message: "Username must be at least 2 characters" });
    }

    const users = await User.find({
      _id: { $ne: req.user.id },
      username: { $regex: username.trim(), $options: "i" },
    })
      .select("fullname displayName username profilePhoto isOnline isPremium mood connectionCount followersCount followingCount")
      .limit(20);

    return res.status(200).json({ users });
  } catch (err) {
    console.error("searchUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ─── FRIEND REQUESTS ────────────────────────────────────

// POST /api/social/friend-request/send/:id
async function sendFriendRequest(req, res) {
  try {
    const toUserId = req.params.id;
    const fromUserId = req.user.id;

    if (toUserId === fromUserId) {
      return res.status(400).json({ message: "Cannot send friend request to yourself" });
    }

    // Check if target user exists
    const targetUser = await User.findById(toUserId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already connected
    const currentUser = await User.findById(fromUserId);
    if (currentUser.connections.includes(toUserId)) {
      return res.status(400).json({ message: "Already connected with this user" });
    }

    // Check if there's already a pending request (either direction)
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { from: fromUserId, to: toUserId, status: "pending" },
        { from: toUserId, to: fromUserId, status: "pending" },
      ],
    });

    if (existingRequest) {
      return res.status(400).json({ message: "Friend request already pending" });
    }

    // Remove any old rejected requests between these users so they can re-request
    await FriendRequest.deleteMany({
      $or: [
        { from: fromUserId, to: toUserId, status: "rejected" },
        { from: toUserId, to: fromUserId, status: "rejected" },
      ],
    });

    const friendRequest = await FriendRequest.create({
      from: fromUserId,
      to: toUserId,
    });

    return res.status(201).json({
      message: "Friend request sent!",
      friendRequest,
    });
  } catch (err) {
    console.error("sendFriendRequest error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Friend request already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/social/friend-request/accept/:requestId
async function acceptFriendRequest(req, res) {
  try {
    const requestId = req.params.requestId;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Only the recipient can accept
    if (friendRequest.to.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    // Update request status
    friendRequest.status = "accepted";
    await friendRequest.save();

    // Add each user to the other's connections and increment counts
    await User.findByIdAndUpdate(friendRequest.from, {
      $addToSet: { connections: friendRequest.to },
      $inc: { connectionCount: 1 },
    });

    await User.findByIdAndUpdate(friendRequest.to, {
      $addToSet: { connections: friendRequest.from },
      $inc: { connectionCount: 1 },
    });

    return res.status(200).json({
      message: "Friend request accepted! You are now connected.",
    });
  } catch (err) {
    console.error("acceptFriendRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/social/friend-request/reject/:requestId
async function rejectFriendRequest(req, res) {
  try {
    const requestId = req.params.requestId;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Only the recipient can reject
    if (friendRequest.to.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    friendRequest.status = "rejected";
    await friendRequest.save();

    return res.status(200).json({ message: "Friend request rejected" });
  } catch (err) {
    console.error("rejectFriendRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/social/friend-request/cancel/:requestId
async function cancelFriendRequest(req, res) {
  try {
    const requestId = req.params.requestId;

    const friendRequest = await FriendRequest.findById(requestId);
    if (!friendRequest) {
      return res.status(404).json({ message: "Friend request not found" });
    }

    // Only the sender can cancel
    if (friendRequest.from.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (friendRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    await FriendRequest.findByIdAndDelete(requestId);

    return res.status(200).json({ message: "Friend request cancelled" });
  } catch (err) {
    console.error("cancelFriendRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/social/friend-requests/received
async function getReceivedFriendRequests(req, res) {
  try {
    const requests = await FriendRequest.find({
      to: req.user.id,
      status: "pending",
    })
      .populate("from", "fullname displayName username profilePhoto isOnline isPremium mood")
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (err) {
    console.error("getReceivedFriendRequests error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/social/friend-requests/sent
async function getSentFriendRequests(req, res) {
  try {
    const requests = await FriendRequest.find({
      from: req.user.id,
      status: "pending",
    })
      .populate("to", "fullname displayName username profilePhoto isOnline isPremium mood")
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (err) {
    console.error("getSentFriendRequests error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/social/friends
async function getFriends(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .populate("connections", "fullname displayName username profilePhoto isOnline isPremium mood connectionCount followersCount followingCount");

    return res.status(200).json({ friends: user.connections || [] });
  } catch (err) {
    console.error("getFriends error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/social/unfriend/:id
async function unfriend(req, res) {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    // Remove from both users' connections
    await User.findByIdAndUpdate(userId, {
      $pull: { connections: targetId },
      $inc: { connectionCount: -1 },
    });

    await User.findByIdAndUpdate(targetId, {
      $pull: { connections: userId },
      $inc: { connectionCount: -1 },
    });

    // Clean up friend request records
    await FriendRequest.deleteMany({
      $or: [
        { from: userId, to: targetId },
        { from: targetId, to: userId },
      ],
    });

    return res.status(200).json({ message: "Unfriended successfully" });
  } catch (err) {
    console.error("unfriend error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// ─── FOLLOW SYSTEM ──────────────────────────────────────

// POST /api/social/follow/:id
async function followUser(req, res) {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    if (targetId === userId) {
      return res.status(400).json({ message: "Cannot follow yourself" });
    }

    const targetUser = await User.findById(targetId);
    if (!targetUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if already following
    const currentUser = await User.findById(userId);
    if (currentUser.following.includes(targetId)) {
      return res.status(400).json({ message: "Already following this user" });
    }

    // Check target's follow approval setting
    if (targetUser.followApproval === "manual") {
      // Check for existing pending request
      const existing = await FollowRequest.findOne({
        from: userId,
        to: targetId,
        status: "pending",
      });

      if (existing) {
        return res.status(400).json({ message: "Follow request already pending" });
      }

      // Remove old rejected requests
      await FollowRequest.deleteMany({
        from: userId,
        to: targetId,
        status: "rejected",
      });

      await FollowRequest.create({ from: userId, to: targetId });

      return res.status(201).json({
        message: "Follow request sent! Waiting for approval.",
        status: "pending",
      });
    }

    // Auto-approve: add follow immediately
    await User.findByIdAndUpdate(userId, {
      $addToSet: { following: targetId },
      $inc: { followingCount: 1 },
    });

    await User.findByIdAndUpdate(targetId, {
      $addToSet: { followers: userId },
      $inc: { followersCount: 1 },
    });

    return res.status(200).json({
      message: "You are now following this user!",
      status: "following",
    });
  } catch (err) {
    console.error("followUser error:", err);
    if (err.code === 11000) {
      return res.status(400).json({ message: "Follow request already exists" });
    }
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/social/unfollow/:id
async function unfollowUser(req, res) {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    await User.findByIdAndUpdate(userId, {
      $pull: { following: targetId },
      $inc: { followingCount: -1 },
    });

    await User.findByIdAndUpdate(targetId, {
      $pull: { followers: userId },
      $inc: { followersCount: -1 },
    });

    // Also clean up any pending follow requests
    await FollowRequest.deleteMany({
      from: userId,
      to: targetId,
    });

    return res.status(200).json({ message: "Unfollowed successfully" });
  } catch (err) {
    console.error("unfollowUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/social/follow-request/accept/:requestId
async function acceptFollowRequest(req, res) {
  try {
    const requestId = req.params.requestId;

    const followRequest = await FollowRequest.findById(requestId);
    if (!followRequest) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    // Only the target can accept
    if (followRequest.to.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (followRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    followRequest.status = "accepted";
    await followRequest.save();

    // Add follow relationship
    await User.findByIdAndUpdate(followRequest.from, {
      $addToSet: { following: followRequest.to },
      $inc: { followingCount: 1 },
    });

    await User.findByIdAndUpdate(followRequest.to, {
      $addToSet: { followers: followRequest.from },
      $inc: { followersCount: 1 },
    });

    return res.status(200).json({ message: "Follow request accepted" });
  } catch (err) {
    console.error("acceptFollowRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/social/follow-request/reject/:requestId
async function rejectFollowRequest(req, res) {
  try {
    const requestId = req.params.requestId;

    const followRequest = await FollowRequest.findById(requestId);
    if (!followRequest) {
      return res.status(404).json({ message: "Follow request not found" });
    }

    if (followRequest.to.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    if (followRequest.status !== "pending") {
      return res.status(400).json({ message: "Request already processed" });
    }

    followRequest.status = "rejected";
    await followRequest.save();

    return res.status(200).json({ message: "Follow request rejected" });
  } catch (err) {
    console.error("rejectFollowRequest error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/social/follow-requests
async function getFollowRequests(req, res) {
  try {
    const requests = await FollowRequest.find({
      to: req.user.id,
      status: "pending",
    })
      .populate("from", "fullname displayName username profilePhoto isOnline isPremium mood")
      .sort({ createdAt: -1 });

    return res.status(200).json({ requests });
  } catch (err) {
    console.error("getFollowRequests error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/social/followers
async function getFollowers(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .populate("followers", "fullname displayName username profilePhoto isOnline isPremium mood connectionCount followersCount followingCount");

    return res.status(200).json({ followers: user.followers || [] });
  } catch (err) {
    console.error("getFollowers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/social/following
async function getFollowing(req, res) {
  try {
    const user = await User.findById(req.user.id)
      .populate("following", "fullname displayName username profilePhoto isOnline isPremium mood connectionCount followersCount followingCount");

    return res.status(200).json({ following: user.following || [] });
  } catch (err) {
    console.error("getFollowing error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// GET /api/social/status/:id — get relationship status with a user
async function getRelationshipStatus(req, res) {
  try {
    const targetId = req.params.id;
    const userId = req.user.id;

    const currentUser = await User.findById(userId);
    const status = {
      isConnected: currentUser.connections.includes(targetId),
      isFollowing: currentUser.following.includes(targetId),
      isFollowedBy: currentUser.followers.includes(targetId),
      pendingFriendRequest: null,
      pendingFollowRequest: null,
    };

    // Check pending friend requests
    const pendingFR = await FriendRequest.findOne({
      $or: [
        { from: userId, to: targetId, status: "pending" },
        { from: targetId, to: userId, status: "pending" },
      ],
    });

    if (pendingFR) {
      status.pendingFriendRequest = {
        id: pendingFR._id,
        direction: pendingFR.from.toString() === userId ? "sent" : "received",
      };
    }

    // Check pending follow requests
    const pendingFollow = await FollowRequest.findOne({
      from: userId,
      to: targetId,
      status: "pending",
    });

    if (pendingFollow) {
      status.pendingFollowRequest = {
        id: pendingFollow._id,
        direction: "sent",
      };
    }

    return res.status(200).json({ status });
  } catch (err) {
    console.error("getRelationshipStatus error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  searchUsers,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  getReceivedFriendRequests,
  getSentFriendRequests,
  getFriends,
  unfriend,
  followUser,
  unfollowUser,
  acceptFollowRequest,
  rejectFollowRequest,
  getFollowRequests,
  getFollowers,
  getFollowing,
  getRelationshipStatus,
};
