const mongoose = require("mongoose");

const followRequestSchema = new mongoose.Schema(
  {
    from: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    to: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "accepted", "rejected"],
      default: "pending",
    },
  },
  { timestamps: true }
);

// Prevent duplicate follow requests between the same two users
followRequestSchema.index({ from: 1, to: 1 }, { unique: true });

const FollowRequest = mongoose.model("FollowRequest", followRequestSchema);

module.exports = FollowRequest;
