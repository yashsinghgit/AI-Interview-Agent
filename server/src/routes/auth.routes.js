const express = require("express");

const {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
} = require("../controllers/auth.controller");

const router = express.Router();

router.post("/register", registerUser);

router.post("/login", loginUser);

router.get("/verify-email/:token", verifyEmail);

router.post("/resend-verification", resendVerificationEmail);

module.exports = router;