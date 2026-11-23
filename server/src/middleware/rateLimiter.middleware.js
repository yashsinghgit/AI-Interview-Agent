const { getDefaultStore } = require("../services/rateLimitStore");

function getClientIp(req) {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    // x-forwarded-for can be a comma-separated list of IPs when going through proxies
    const firstIp = forwarded.split(",")[0].trim();
    if (firstIp) return firstIp;
  }

  const realIp = req.headers["x-real-ip"];
  if (realIp) return realIp.trim();

  return req.ip || req.socket?.remoteAddress || "127.0.0.1";
}

function createRateLimiter({
  prefix,
  windowSeconds,
  maxHits,
  message,
  keyGenerator,
  customStore,
}) {
  return async (req, res, next) => {
    try {
      const store = customStore || getDefaultStore();
      const clientIp = getClientIp(req);

      let keySuffix;
      if (typeof keyGenerator === "function") {
        keySuffix = keyGenerator(req, clientIp);
      } else {
        keySuffix = clientIp;
      }

      const key = `${prefix}:${keySuffix}`;

      const { totalHits, remainingSeconds } = await store.increment(
        key,
        windowSeconds
      );

      // Standard RateLimit response headers
      res.setHeader("RateLimit-Limit", maxHits);
      res.setHeader(
        "RateLimit-Remaining",
        Math.max(0, maxHits - totalHits)
      );
      res.setHeader("RateLimit-Reset", remainingSeconds);

      if (totalHits > maxHits) {
        // Retry-After header in seconds (RFC 6585)
        res.setHeader("Retry-After", remainingSeconds);

        return res.status(429).json({
          message:
            message || "Too many requests. Please try again later.",
          retryAfter: remainingSeconds,
        });
      }

      next();
    } catch (error) {
      // Fail-open: If the rate limiter store experiences a temporary failure,
      // log the error and allow the request through so the API remains available.
      console.error(`Rate limiter error for ${prefix}:`, error.message);
      next();
    }
  };
}

// -------------------------------------------------------------
// 1. Registration Rate Limiter (5 requests per 15 mins per IP)
// -------------------------------------------------------------
const registerLimiter = createRateLimiter({
  prefix: "rl:register",
  windowSeconds: 15 * 60, // 15 minutes
  maxHits: 5,
  message: "Too many accounts created from this IP. Please try again in 15 minutes.",
});

// -------------------------------------------------------------
// 2. Login Rate Limiter (5 requests per 15 mins per IP/email)
// -------------------------------------------------------------
const loginLimiter = createRateLimiter({
  prefix: "rl:login",
  windowSeconds: 15 * 60, // 15 minutes
  maxHits: 5,
  keyGenerator: (req, clientIp) => {
    const email = req.body?.email ? req.body.email.trim().toLowerCase() : "";
    return email ? `${clientIp}:${email}` : clientIp;
  },
  message: "Too many login attempts. Please try again in 15 minutes.",
});

// -------------------------------------------------------------
// 3. Email Verification / Resend Limiter (5 requests per 15 mins per IP)
// -------------------------------------------------------------
const emailVerificationLimiter = createRateLimiter({
  prefix: "rl:email-verify",
  windowSeconds: 15 * 60, // 15 minutes
  maxHits: 5,
  message: "Too many verification requests. Please try again in 15 minutes.",
});

// -------------------------------------------------------------
// 4. Password Reset Limiter (3 requests per 15 mins per IP)
// -------------------------------------------------------------
const passwordResetLimiter = createRateLimiter({
  prefix: "rl:password-reset",
  windowSeconds: 15 * 60, // 15 minutes
  maxHits: 3,
  message: "Too many password reset requests. Please try again in 15 minutes.",
});

// -------------------------------------------------------------
// 5. Interview Creation Limiter (5 interviews per hour per User)
// -------------------------------------------------------------
const interviewCreateLimiter = createRateLimiter({
  prefix: "rl:interview:create",
  windowSeconds: 60 * 60, // 1 hour
  maxHits: 5,
  keyGenerator: (req, clientIp) => req.user?.userId || clientIp,
  message: "Interview creation limit reached. You can create up to 5 interviews per hour.",
});

// -------------------------------------------------------------
// 6. Question Generation Limiter (15 questions per minute per User)
// -------------------------------------------------------------
const questionGenerateLimiter = createRateLimiter({
  prefix: "rl:interview:question",
  windowSeconds: 60, // 1 minute
  maxHits: 15,
  keyGenerator: (req, clientIp) => req.user?.userId || clientIp,
  message: "Question generation rate limit reached. Please wait a moment before requesting another question.",
});

// -------------------------------------------------------------
// 7. Answer Evaluation Limiter (15 answers per minute per User)
// -------------------------------------------------------------
const answerEvaluationLimiter = createRateLimiter({
  prefix: "rl:interview:answer",
  windowSeconds: 60, // 1 minute
  maxHits: 15,
  keyGenerator: (req, clientIp) => req.user?.userId || clientIp,
  message: "Answer evaluation rate limit reached. Please wait a moment before submitting another answer.",
});

module.exports = {
  createRateLimiter,
  getClientIp,
  registerLimiter,
  loginLimiter,
  emailVerificationLimiter,
  passwordResetLimiter,
  interviewCreateLimiter,
  questionGenerateLimiter,
  answerEvaluationLimiter,
};
