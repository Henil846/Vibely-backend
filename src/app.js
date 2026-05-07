const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");
const connectDB = require("./db/db");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const socialRoutes = require("./routes/social.routes");

const app = express();

// Middleware
app.use(cors({
  origin: [
    "http://localhost:5173",
    "http://localhost:5174",
    "http://localhost:3000",
    "https://henil846.github.io",
    "https://vibely-backend-delta.vercel.app",
  ],
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Ensure DB is connected before every request (essential for Vercel serverless)
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection failed:", err.message);
    res.status(500).json({ message: "Database connection failed" });
  }
});

// Health check
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", message: "Vibely API is running" });
});

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/user", userRoutes);
app.use("/api/social", socialRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

// Error handler
app.use((err, req, res, next) => {
  console.error("Server error:", err);
  res.status(500).json({ message: "Internal server error" });
});

module.exports = app;
