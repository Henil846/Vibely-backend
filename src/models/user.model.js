const mongoose = require("mongoose");

const allowedInterests = [
  "Music",
  "Movies",
  "Gaming",
  "Sports",
  "Travel",
  "Photography",
  "Cooking",
  "Reading",
  "Art",
  "Fashion",
  "Fitness",
  "Technology",
  "Science",
  "Nature",
  "Dancing",
  "Writing",
  "Anime",
  "Comedy",
  "Podcasts",
  "Yoga",
  "Meditation",
  "Coding",
  "Design",
  "Singing",
  "Volunteering",
  "Pets",
  "Food",
  "Coffee",
  "Startups",
  "Crypto"
];

const userSchema = new mongoose.Schema(
  {
    fullname: {
      type: String,
      required: true,
    },

    displayName: {
      type: String,
      default: "",
    },

    username: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
      unique: true,
      match: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      match: /^[+]?[\d\s()-]{7,15}$/,
    },

    password: {
      type: String,
      required: true,
      minlength: 6,
    },

    age: {
      type: String,
      required: true,
    },

    gender: {
      type: String,
      required: true,
      enum: ["male", "female", "non-binary", "other", "prefer-not-to-say"],
    },

    talk_with: {
      type: String,
      required: true,
      enum: ["male", "female", "non-binary", "everyone"],
    },

    city: {
      type: String,
      default: "",
    },

    state: {
      type: String,
      default: "",
    },

    bio: {
      type: String,
      default: "",
    },

    profilePhoto: {
      type: String,
      default: "",
    },

    interests: {
      type: [String],
      default: [],
      validate: [
        {
          validator: function (arr) {
            return arr.length <= 5;
          },
          message: "You can select up to 5 interests only",
        },
        {
          validator: function (arr) {
            return arr.every((interest) => allowedInterests.includes(interest));
          },
          message: "Invalid interest selected",
        },
      ],
    },

    mood: {
      type: String,
      default: "happy",
    },

    communicationMode: {
      type: String,
      default: "text",
      enum: ["text", "voice", "video"],
    },

    isOnline: {
      type: Boolean,
      default: false,
    },

    isPremium: {
      type: Boolean,
      default: false,
    },

    premiumPlan: {
      type: String,
      default: null,
    },

    premiumExpiry: {
      type: Date,
      default: null,
    },

    privacy: {
      location: {
        type: String,
        default: "city",
        enum: ["hidden", "city", "region"],
      },
      profile: {
        type: String,
        default: "everyone",
        enum: ["everyone", "matches", "hidden"],
      },
    },

    blockedUsers: {
      type: [mongoose.Schema.Types.ObjectId],
      ref: "User",
      default: [],
    },

    dailyMatchCount: {
      type: Number,
      default: 0,
    },

    dailyChatRequests: {
      type: Number,
      default: 0,
    },

    lastMatchReset: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

// Virtual for preferred gender (frontend uses 'preferredGender', backend uses 'talk_with')
userSchema.virtual("preferredGender").get(function () {
  return this.talk_with;
});

// Ensure virtuals are included in JSON
userSchema.set("toJSON", { virtuals: true });
userSchema.set("toObject", { virtuals: true });

const User = mongoose.model("User", userSchema);

module.exports = User;