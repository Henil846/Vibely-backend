const mongoose = require("mongoose");

let isConnected = false;

async function connectDB() {
  if (isConnected) {
    return;
  }

  try {
    const opts = {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
    };

    await mongoose.connect(process.env.MONGO_URI, opts);
    isConnected = true;
    console.log("Connected to database");
  } catch (err) {
    console.error("Error connecting to MongoDB:", err.message);
    // In serverless, don't exit — just throw so the request fails gracefully
    throw err;
  }
}

module.exports = connectDB;