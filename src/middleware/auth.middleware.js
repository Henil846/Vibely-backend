const jwt = require("jsonwebtoken");

// Extract token from cookie or Authorization header
function extractToken(req) {
  // 1. Check cookie
  if (req.cookies && req.cookies.token) {
    return req.cookies.token;
  }
  // 2. Check Authorization: Bearer <token> header
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }
  return null;
}

function authMiddleware(req, res, next) {
  const token = extractToken(req);

  if (!token) {
    return res.status(401).json({
      message: "Not authenticated",
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
}

// Optional auth - doesn't block but attaches user if token present
function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Token invalid, continue without user
    }
  }
  next();
}

module.exports = { authMiddleware, optionalAuth };