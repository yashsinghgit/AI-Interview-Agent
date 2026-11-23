const jwt = require("jsonwebtoken");
const User = require("../models/user.model");

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Authorization header missing",
      });
    }

    if (!authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        message: "Invalid authorization header format",
      });
    }

    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Invalidate sessions issued before a password change
    if (decoded.userId) {
      const user = await User.findById(decoded.userId).select("passwordChangedAt");
      if (user && user.passwordChangedAt) {
        const changedTimestamp = Math.floor(user.passwordChangedAt.getTime() / 1000);
        if (decoded.iat && decoded.iat < changedTimestamp) {
          return res.status(401).json({
            message: "Password was recently changed. Please log in again.",
          });
        }
      }
    }

    req.user = decoded;
    next();
  } catch (error) {
    console.error("Authentication error:", error?.message || error);
    return res.status(401).json({
      message: "Invalid or expired token",
    });
  }
};

module.exports = authMiddleware;