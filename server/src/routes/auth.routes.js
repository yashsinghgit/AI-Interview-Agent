const express = require("express");

const {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationEmail,
  requestPasswordReset,
  resetPassword,
} = require("../controllers/auth.controller");

const {
  registerLimiter,
  loginLimiter,
  emailVerificationLimiter,
  passwordResetLimiter,
} = require("../middleware/rateLimiter.middleware");

const validate = require("../middleware/validate.middleware");
const {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordBodySchema,
  tokenParamSchema,
} = require("../validators/auth.validator");

const router = express.Router();

router.post(
  "/register",
  registerLimiter,
  validate({ body: registerSchema }),
  registerUser
);

router.post(
  "/login",
  loginLimiter,
  validate({ body: loginSchema }),
  loginUser
);

router.get(
  "/verify-email/:token",
  emailVerificationLimiter,
  validate({ params: tokenParamSchema }),
  verifyEmail
);

router.post(
  "/resend-verification",
  emailVerificationLimiter,
  validate({ body: resendVerificationSchema }),
  resendVerificationEmail
);

// Password Reset Routes
router.post(
  "/forgot-password",
  passwordResetLimiter,
  validate({ body: forgotPasswordSchema }),
  requestPasswordReset
);

router.post(
  "/reset-password",
  passwordResetLimiter,
  validate({ body: resetPasswordBodySchema }),
  resetPassword
);

router.post(
  "/reset-password/:token",
  passwordResetLimiter,
  validate({ params: tokenParamSchema, body: resetPasswordBodySchema }),
  resetPassword
);

module.exports = router;