const User = require("../models/user.model");

// GET /api/user/me — get current user profile
async function getMe(req, res) {
  try {
    const user = await User.findById(req.user.id).select("-password");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }
    return res.status(200).json({ user });
  } catch (err) {
    console.error("getMe error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// PUT /api/user/update — update user profile
async function updateProfile(req, res) {
  try {
    const allowedFields = [
      "fullname",
      "displayName",
      "username",
      "age",
      "gender",
      "talk_with",
      "city",
      "state",
      "bio",
      "profilePhoto",
      "interests",
      "mood",
      "communicationMode",
      "privacy",
      "isOnline",
    ];

    const updates = {};
    for (const field of allowedFields) {
      if (req.body[field] !== undefined) {
        updates[field] = req.body[field];
      }
    }

    // Handle frontend field mapping
    if (req.body.preferredGender !== undefined) {
      updates.talk_with = req.body.preferredGender;
    }
    if (req.body.region !== undefined) {
      updates.state = req.body.region;
    }
    if (req.body.photoURL !== undefined) {
      updates.profilePhoto = req.body.photoURL;
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $set: updates },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    return res.status(200).json({
      message: "Profile updated successfully",
      user,
    });
  } catch (err) {
    console.error("updateProfile error:", err);
    return res.status(500).json({ message: err.message });
  }
}

// GET /api/user/discover — discover users with filters
async function discoverUsers(req, res) {
  try {
    const { mood, gender, mode, ageMin, ageMax, city } = req.query;

    const currentUser = await User.findById(req.user.id);
    if (!currentUser) {
      return res.status(404).json({ message: "User not found" });
    }

    // Build filter query
    const query = {
      _id: { $ne: req.user.id, $nin: currentUser.blockedUsers || [] },
    };

    // Filter by preferred gender of current user
    if (
      currentUser.talk_with &&
      currentUser.talk_with !== "everyone"
    ) {
      query.gender = currentUser.talk_with;
    }

    // Apply additional filters
    if (mood) query.mood = mood;
    if (gender) query.gender = gender;
    if (mode) query.communicationMode = mode;
    if (city) query.city = { $regex: city, $options: "i" };

    // Age range filter
    if (ageMin || ageMax) {
      query.age = {};
      if (ageMin) query.age.$gte = ageMin;
      if (ageMax) query.age.$lte = ageMax;
    }

    // Don't show users who have hidden profiles
    query["privacy.profile"] = { $ne: "hidden" };

    const users = await User.find(query)
      .select("-password")
      .limit(50)
      .sort({ isOnline: -1, updatedAt: -1 });

    return res.status(200).json({ users });
  } catch (err) {
    console.error("discoverUsers error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/user/block/:id — block a user
async function blockUser(req, res) {
  try {
    const userIdToBlock = req.params.id;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { $addToSet: { blockedUsers: userIdToBlock } },
      { new: true }
    ).select("-password");

    return res.status(200).json({
      message: "User blocked successfully",
      user,
    });
  } catch (err) {
    console.error("blockUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

// POST /api/user/report — report a user
async function reportUser(req, res) {
  try {
    const { userId, reason, category, details } = req.body;

    // Log the report (in production, save to a Reports collection)
    console.log("Report received:", {
      reportedBy: req.user.id,
      reportedUser: userId,
      reason,
      category,
      details,
      timestamp: new Date(),
    });

    return res.status(200).json({
      message: "Report submitted successfully. We will review it shortly.",
    });
  } catch (err) {
    console.error("reportUser error:", err);
    return res.status(500).json({ message: "Server error" });
  }
}

module.exports = {
  getMe,
  updateProfile,
  discoverUsers,
  blockUser,
  reportUser,
};
