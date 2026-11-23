const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const express = require("express");

// Import the app and validators
const validate = require("./src/middleware/validate.middleware");
const {
  registerSchema,
  loginSchema,
  resendVerificationSchema,
  forgotPasswordSchema,
  resetPasswordBodySchema,
  tokenParamSchema,
} = require("./src/validators/auth.validator");
const {
  interviewIdParamSchema,
  createInterviewSchema,
  updateInterviewSchema,
  getMyInterviewsQuerySchema,
  submitAnswerSchema,
} = require("./src/validators/interviewRequest.validator");
const {
  testInterviewPlanSchema,
} = require("./src/validators/aiRequest.validator");

// Build a dedicated lightweight Express test app with the validation middleware mounted
function buildTestApp() {
  const app = express();
  app.use(express.json({ limit: "1mb" }));

  app.post("/api/register", validate({ body: registerSchema }), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });

  app.post("/api/login", validate({ body: loginSchema }), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });

  app.get("/api/verify-email/:token", validate({ params: tokenParamSchema }), (req, res) => {
    res.status(200).json({ success: true, params: req.params });
  });

  app.post("/api/forgot-password", validate({ body: forgotPasswordSchema }), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });

  app.post("/api/reset-password", validate({ body: resetPasswordBodySchema }), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });

  app.post("/api/interviews", validate({ body: createInterviewSchema }), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });

  app.get("/api/interviews", validate({ query: getMyInterviewsQuerySchema }), (req, res) => {
    res.status(200).json({ success: true, query: req.query });
  });

  app.get("/api/interviews/:id", validate({ params: interviewIdParamSchema }), (req, res) => {
    res.status(200).json({ success: true, params: req.params });
  });

  app.post("/api/interviews/:id/answer", validate({ params: interviewIdParamSchema, body: submitAnswerSchema }), (req, res) => {
    res.status(200).json({ success: true, params: req.params, data: req.body });
  });

  app.post("/api/test-interview-plan", validate({ body: testInterviewPlanSchema }), (req, res) => {
    res.status(200).json({ success: true, data: req.body });
  });

  return app;
}

async function runValidationTests() {
  console.log("==================================================");
  console.log("RUNNING ZOD REQUEST VALIDATION TEST SUITE");
  console.log("==================================================\n");

  const app = buildTestApp();
  const server = await new Promise((resolve) => {
    const s = app.listen(0, () => resolve(s));
  });
  const port = server.address().port;
  const baseUrl = `http://127.0.0.1:${port}`;

  const client = {
    get: async (endpoint) => {
      const res = await fetch(`${baseUrl}${endpoint}`);
      const body = await res.json();
      return { status: res.status, body };
    },
    post: async (endpoint, data) => {
      const res = await fetch(`${baseUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const body = await res.json();
      return { status: res.status, body };
    },
  };

  try {
    // ----------------------------------------------------
    // TEST 1: Register Schema Validation
    // ----------------------------------------------------
    console.log("--- TEST 1: User Registration Validation ---");
    {
      // 1a. Valid input
      const validRes = await client.post("/api/register", {
        name: "Alice Developer",
        email: "alice@example.com",
        password: "Password123!",
      });
      if (validRes.status !== 200 || !validRes.body.success) {
        throw new Error(`Expected 200 for valid registration, got ${validRes.status}: ${JSON.stringify(validRes.body)}`);
      }

      // 1b. Invalid email
      const invalidEmailRes = await client.post("/api/register", {
        name: "Alice",
        email: "not-an-email",
        password: "Password123!",
      });
      if (invalidEmailRes.status !== 400 || !invalidEmailRes.body.errors.some((e) => e.field === "email")) {
        throw new Error(`Expected 400 with email error, got: ${JSON.stringify(invalidEmailRes.body)}`);
      }

      // 1c. Short password (< 6 chars)
      const shortPassRes = await client.post("/api/register", {
        name: "Alice",
        email: "alice@example.com",
        password: "123",
      });
      if (shortPassRes.status !== 400 || !shortPassRes.body.errors.some((e) => e.field === "password")) {
        throw new Error(`Expected 400 with password length error, got: ${JSON.stringify(shortPassRes.body)}`);
      }

      // 1d. Strict mode: unexpected extra field rejected
      const extraFieldRes = await client.post("/api/register", {
        name: "Alice",
        email: "alice@example.com",
        password: "Password123!",
        role: "admin",
        isAdmin: true,
      });
      if (extraFieldRes.status !== 400 || !extraFieldRes.body.errors.some((e) => e.code === "unrecognized_keys")) {
        throw new Error(`Expected 400 with unrecognized_keys error, got: ${JSON.stringify(extraFieldRes.body)}`);
      }

      console.log("PASS: Valid registrations pass; invalid email, short password, and injected unexpected keys rejected.");
    }

    // ----------------------------------------------------
    // TEST 2: Route Parameter Validation (ObjectId & Token)
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Route Parameter Validation (ObjectId & Token) ---");
    {
      // 2a. Valid 24-character hex ObjectId
      const validIdRes = await client.get("/api/interviews/507f1f77bcf86cd799439011");
      if (validIdRes.status !== 200) {
        throw new Error(`Expected 200 for valid ObjectId, got ${validIdRes.status}`);
      }

      // 2b. Malformed ObjectId (too short or invalid chars)
      const malformedIdRes = await client.get("/api/interviews/invalid-id-123");
      if (malformedIdRes.status !== 400 || !malformedIdRes.body.errors.some((e) => e.field === "id")) {
        throw new Error(`Expected 400 for malformed ObjectId, got ${malformedIdRes.status}`);
      }

      // 2c. Valid token parameter
      const validTokenRes = await client.get("/api/verify-email/abcdef1234567890abcdef1234567890");
      if (validTokenRes.status !== 200) {
        throw new Error(`Expected 200 for valid token, got ${validTokenRes.status}`);
      }

      // 2d. Short token parameter
      const shortTokenRes = await client.get("/api/verify-email/abc");
      if (shortTokenRes.status !== 400 || !shortTokenRes.body.errors.some((e) => e.field === "token")) {
        throw new Error(`Expected 400 for short token, got ${shortTokenRes.status}`);
      }

      console.log("PASS: 24-hex ObjectId and tokens strictly validated in route parameters.");
    }

    // ----------------------------------------------------
    // TEST 3: Interview Creation Body Validation
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Interview Setup Validation ---");
    {
      // 3a. Valid interview setup
      const validInterview = await client.post("/api/interviews", {
        role: "Full Stack Engineer",
        difficulty: "medium",
        jobDescription: "Requires 2+ years experience in React, Node.js, and MongoDB.",
        resumeText: "Built high-performance full-stack web applications.",
      });
      if (validInterview.status !== 200) {
        throw new Error(`Expected 200 for valid interview setup, got ${validInterview.status}`);
      }

      // 3b. Invalid difficulty enum
      const invalidDiff = await client.post("/api/interviews", {
        role: "Full Stack Engineer",
        difficulty: "nightmare", // invalid
        jobDescription: "Requires 2+ years experience in React and Node.js.",
      });
      if (invalidDiff.status !== 400 || !invalidDiff.body.errors.some((e) => e.field === "difficulty")) {
        throw new Error(`Expected 400 with difficulty enum error, got: ${JSON.stringify(invalidDiff.body)}`);
      }

      // 3c. Short job description (< 10 chars)
      const shortJd = await client.post("/api/interviews", {
        role: "Developer",
        difficulty: "easy",
        jobDescription: "short", // too short
      });
      if (shortJd.status !== 400 || !shortJd.body.errors.some((e) => e.field === "jobDescription")) {
        throw new Error(`Expected 400 with jobDescription min length error, got: ${JSON.stringify(shortJd.body)}`);
      }

      // 3d. Excessive resume length (> 50,000 chars)
      const hugeResume = "A".repeat(50001);
      const oversizedResumeRes = await client.post("/api/interviews", {
        role: "Developer",
        difficulty: "easy",
        jobDescription: "A valid job description exceeding 10 characters.",
        resumeText: hugeResume,
      });
      if (oversizedResumeRes.status !== 400 || !oversizedResumeRes.body.errors.some((e) => e.field === "resumeText")) {
        throw new Error(`Expected 400 with resumeText max length error, got: ${JSON.stringify(oversizedResumeRes.body)}`);
      }

      console.log("PASS: Role, difficulty enum, job description limits, and resume text limits strictly enforced.");
    }

    // ----------------------------------------------------
    // TEST 4: Candidate Answer Submission Validation
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Candidate Answer Submission Validation ---");
    {
      // 4a. Valid answer
      const validAnswerRes = await client.post("/api/interviews/507f1f77bcf86cd799439011/answer", {
        answer: "An idempotent API produces the same state regardless of how many times it is called.",
      });
      if (validAnswerRes.status !== 200) {
        throw new Error(`Expected 200 for valid answer, got ${validAnswerRes.status}`);
      }

      // 4b. Empty answer
      const emptyAnswerRes = await client.post("/api/interviews/507f1f77bcf86cd799439011/answer", {
        answer: "   ",
      });
      if (emptyAnswerRes.status !== 400 || !emptyAnswerRes.body.errors.some((e) => e.field === "answer")) {
        throw new Error(`Expected 400 for empty answer, got: ${JSON.stringify(emptyAnswerRes.body)}`);
      }

      // 4c. Oversized answer (> 10,000 chars)
      const oversizedAnswer = "X".repeat(10001);
      const oversizedAnswerRes = await client.post("/api/interviews/507f1f77bcf86cd799439011/answer", {
        answer: oversizedAnswer,
      });
      if (oversizedAnswerRes.status !== 400 || !oversizedAnswerRes.body.errors.some((e) => e.field === "answer")) {
        throw new Error(`Expected 400 for oversized answer, got: ${JSON.stringify(oversizedAnswerRes.body)}`);
      }

      console.log("PASS: Empty and oversized candidate answers rejected with structured error response.");
    }

    // ----------------------------------------------------
    // TEST 5: Query Parameter Coercion & Bounds
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Query Parameter Coercion & Bounds ---");
    {
      // 5a. Normal pagination query
      const normalQuery = await client.get("/api/interviews?page=3&limit=25");
      if (normalQuery.status !== 200 || normalQuery.body.query.page !== 3 || normalQuery.body.query.limit !== 25) {
        throw new Error(`Expected coerced page=3 limit=25, got: ${JSON.stringify(normalQuery.body.query)}`);
      }

      // 5b. Negative / NaN query parameters fallback to safe defaults
      const invalidQuery = await client.get("/api/interviews?page=-5&limit=abc");
      if (invalidQuery.status !== 200 || invalidQuery.body.query.page !== 1 || invalidQuery.body.query.limit !== 10) {
        throw new Error(`Expected fallback to page=1 limit=10, got: ${JSON.stringify(invalidQuery.body.query)}`);
      }

      // 5c. Limit > 50 clamped to 50
      const clampedQuery = await client.get("/api/interviews?limit=500");
      if (clampedQuery.status !== 200 || clampedQuery.body.query.limit !== 50) {
        throw new Error(`Expected clamped limit=50, got: ${JSON.stringify(clampedQuery.body.query)}`);
      }

      console.log("PASS: Query parameters coerced, sanitized, and clamped safely.");
    }

    // ----------------------------------------------------
    // TEST 6: Structured Error Schema Output
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Consistency of Validation Error Response Format ---");
    {
      const res = await client.post("/api/login", {});
      if (res.status !== 400) {
        throw new Error(`Expected 400, got ${res.status}`);
      }
      if (res.body.message !== "Validation failed" || !Array.isArray(res.body.errors)) {
        throw new Error(`Inconsistent error format: ${JSON.stringify(res.body)}`);
      }
      for (const err of res.body.errors) {
        if (typeof err.field !== "string" || typeof err.message !== "string" || typeof err.code !== "string") {
          throw new Error(`Missing required error issue keys: ${JSON.stringify(err)}`);
        }
      }
      console.log("PASS: Error responses adhere strictly to standard { message, errors: [ { field, message, code } ] } format.");
    }

    console.log("\n==================================================");
    console.log("ALL ZOD REQUEST VALIDATION TESTS PASSED!");
    console.log("==================================================");
  } finally {
    server.close();
  }
}

runValidationTests().catch((err) => {
  console.error("Validation Test Suite Failed:", err);
  process.exit(1);
});
