const {
  callGeminiWithRetry,
  isRetryableError,
  extractRetryAfterMs,
  calculateBackoffWithJitter,
  withTimeout,
  parseCleanJsonResponse,
  setAiClient,
  getAiClient,
  generateInterviewPlan,
  generateQuestion,
  evaluateAnswer,
  generateFollowUp,
  generateFinalReport,
} = require("./src/services/ai.service");

async function runTestSuite() {
  console.log("==================================================");
  console.log("RUNNING AI SERVICE ERROR HANDLING & RETRY TESTS");
  console.log("==================================================\n");

  const originalClient = getAiClient();

  try {
    // ----------------------------------------------------
    // TEST 1: Error Classification (isRetryableError)
    // ----------------------------------------------------
    console.log("--- TEST 1: Error Classification (Transient vs Permanent) ---");
    {
      // Permanent errors (must NOT retry)
      if (isRetryableError({ status: 401, message: "API_KEY_INVALID" }) !== false) {
        throw new Error("Failed: 401 API_KEY_INVALID was classified as retryable!");
      }
      if (isRetryableError({ status: 403, message: "PERMISSION_DENIED" }) !== false) {
        throw new Error("Failed: 403 PERMISSION_DENIED was classified as retryable!");
      }
      if (isRetryableError({ status: 400, message: "INVALID_ARGUMENT: Bad request" }) !== false) {
        throw new Error("Failed: 400 INVALID_ARGUMENT was classified as retryable!");
      }
      if (isRetryableError({ status: 404, message: "Model not found" }) !== false) {
        throw new Error("Failed: 404 was classified as retryable!");
      }

      // Transient errors (MUST retry)
      if (isRetryableError({ status: 429, message: "RESOURCE_EXHAUSTED" }) !== true) {
        throw new Error("Failed: 429 was NOT classified as retryable!");
      }
      if (isRetryableError({ status: 503, message: "Service Unavailable / high demand" }) !== true) {
        throw new Error("Failed: 503 was NOT classified as retryable!");
      }
      if (isRetryableError({ status: 500, message: "Internal Server Error" }) !== true) {
        throw new Error("Failed: 500 was NOT classified as retryable!");
      }
      if (isRetryableError({ status: 502, message: "Bad Gateway" }) !== true) {
        throw new Error("Failed: 502 was NOT classified as retryable!");
      }
      if (isRetryableError({ status: 504, message: "Gateway Timeout" }) !== true) {
        throw new Error("Failed: 504 was NOT classified as retryable!");
      }
      if (isRetryableError({ code: "ETIMEDOUT", message: "Connect timed out" }) !== true) {
        throw new Error("Failed: ETIMEDOUT was NOT classified as retryable!");
      }
      if (isRetryableError({ code: "ECONNRESET", message: "Socket reset" }) !== true) {
        throw new Error("Failed: ECONNRESET was NOT classified as retryable!");
      }
      console.log("PASS: Transient errors (429, 5xx, network) and permanent errors (400, 401, 403, 404) correctly classified.");
    }

    // ----------------------------------------------------
    // TEST 2: Retry-After Extraction
    // ----------------------------------------------------
    console.log("\n--- TEST 2: Retry-After Header & Message Extraction ---");
    {
      // Header as numeric seconds
      const errHeaderSec = { headers: { "retry-after": "5" } };
      if (extractRetryAfterMs(errHeaderSec) !== 5000) {
        throw new Error(`Expected 5000ms from header "5", got ${extractRetryAfterMs(errHeaderSec)}`);
      }

      // Header via get() method
      const errHeaderMap = {
        response: {
          headers: {
            get: (name) => (name.toLowerCase() === "retry-after" ? "2.5" : null),
          },
        },
      };
      if (extractRetryAfterMs(errHeaderMap) !== 2500) {
        throw new Error(`Expected 2500ms from header map "2.5", got ${extractRetryAfterMs(errHeaderMap)}`);
      }

      // String pattern in error message: "Please retry after 4s"
      const errMessage = { message: "Quota exceeded for quota metric. Please retry after 4s." };
      if (extractRetryAfterMs(errMessage) !== 4000) {
        throw new Error(`Expected 4000ms from message, got ${extractRetryAfterMs(errMessage)}`);
      }

      // String pattern with ms: "retry in 350ms"
      const errMessageMs = { message: "Rate limit exceeded, retry in 350ms." };
      if (extractRetryAfterMs(errMessageMs) !== 350) {
        throw new Error(`Expected 350ms from message, got ${extractRetryAfterMs(errMessageMs)}`);
      }

      console.log("PASS: Retry-After header and regex messages successfully extracted.");
    }

    // ----------------------------------------------------
    // TEST 3: Exponential Backoff with Jitter
    // ----------------------------------------------------
    console.log("\n--- TEST 3: Exponential Backoff & Jitter Distribution ---");
    {
      const delaysAttempt1 = [];
      const delaysAttempt2 = [];
      const delaysAttempt3 = [];

      for (let i = 0; i < 30; i++) {
        delaysAttempt1.push(calculateBackoffWithJitter(1, 1000, 10000));
        delaysAttempt2.push(calculateBackoffWithJitter(2, 1000, 10000));
        delaysAttempt3.push(calculateBackoffWithJitter(3, 1000, 10000));
      }

      // Attempt 1: base exponential = 1000ms. Range should be [500ms, 1000ms]
      delaysAttempt1.forEach((d) => {
        if (d < 500 || d > 1000) {
          throw new Error(`Attempt 1 delay out of range [500, 1000]: ${d}`);
        }
      });

      // Attempt 2: base exponential = 2000ms. Range should be [1000ms, 2000ms]
      delaysAttempt2.forEach((d) => {
        if (d < 1000 || d > 2000) {
          throw new Error(`Attempt 2 delay out of range [1000, 2000]: ${d}`);
        }
      });

      // Attempt 3: base exponential = 4000ms. Range should be [2000ms, 4000ms]
      delaysAttempt3.forEach((d) => {
        if (d < 2000 || d > 4000) {
          throw new Error(`Attempt 3 delay out of range [2000, 4000]: ${d}`);
        }
      });

      // Verify that values are jittered (not all identical)
      const uniqueVals = new Set(delaysAttempt1);
      if (uniqueVals.size < 3) {
        throw new Error("Jitter failed: insufficient variance in generated delays.");
      }

      console.log("PASS: Backoff exponentially doubles and jitter is evenly distributed.");
    }

    // ----------------------------------------------------
    // TEST 4: Transient 429 Retry & Eventual Success
    // ----------------------------------------------------
    console.log("\n--- TEST 4: Transient 429 Rate Limit Retry & Eventual Success ---");
    {
      let attempts = 0;
      const mockClient = {
        models: {
          generateContent: async () => {
            attempts++;
            if (attempts === 1) {
              const err = new Error("RESOURCE_EXHAUSTED: Rate limit exceeded");
              err.status = 429;
              throw err;
            }
            return { text: "Success response after 429 retry" };
          },
        },
      };

      setAiClient(mockClient);

      const res = await callGeminiWithRetry(
        { model: "gemini-3.5-flash-lite", contents: "test" },
        { operationName: "test429Retry", initialDelayMs: 20, maxDelayMs: 50, maxAttempts: 3 }
      );

      if (attempts !== 2) {
        throw new Error(`Expected exactly 2 attempts, got ${attempts}`);
      }
      if (res.text !== "Success response after 429 retry") {
        throw new Error(`Unexpected response: ${res.text}`);
      }
      console.log("PASS: Handled 429 transient error with backoff retry and succeeded on attempt 2.");
    }

    // ----------------------------------------------------
    // TEST 5: Transient 503 High Demand Exhaustion
    // ----------------------------------------------------
    console.log("\n--- TEST 5: Transient 503 Retry Exhaustion ---");
    {
      let attempts = 0;
      const mockClient = {
        models: {
          generateContent: async () => {
            attempts++;
            const err = new Error("503 Service Unavailable: High demand spike");
            err.status = 503;
            throw err;
          },
        },
      };

      setAiClient(mockClient);

      let caughtError = null;
      try {
        await callGeminiWithRetry(
          { model: "gemini-3.5-flash-lite", contents: "test" },
          { operationName: "test503Exhaustion", initialDelayMs: 10, maxDelayMs: 30, maxAttempts: 3 }
        );
      } catch (err) {
        caughtError = err;
      }

      if (!caughtError) {
        throw new Error("Expected callGeminiWithRetry to throw after exhausting attempts");
      }
      if (attempts !== 3) {
        throw new Error(`Expected exactly 3 attempts before exhaustion, got ${attempts}`);
      }
      if (caughtError.status !== 503) {
        throw new Error(`Expected status 503, got ${caughtError.status}`);
      }
      console.log("PASS: Retried 3 times on transient 503 before cleanly failing.");
    }

    // ----------------------------------------------------
    // TEST 6: Fast Fail on Permanent Errors (401 & 400)
    // ----------------------------------------------------
    console.log("\n--- TEST 6: Fast Fail on Permanent Errors (Zero Retries) ---");
    {
      // 401 Invalid Key
      let attempts401 = 0;
      const mock401Client = {
        models: {
          generateContent: async () => {
            attempts401++;
            const err = new Error("API_KEY_INVALID: User API key is not valid.");
            err.status = 401;
            throw err;
          },
        },
      };
      setAiClient(mock401Client);

      let caught401 = null;
      try {
        await callGeminiWithRetry(
          { model: "gemini-3.5-flash-lite", contents: "test" },
          { operationName: "test401FastFail", maxAttempts: 3 }
        );
      } catch (err) {
        caught401 = err;
      }

      if (attempts401 !== 1) {
        throw new Error(`Expected 401 to fail immediately on attempt 1, but ran ${attempts401} attempts!`);
      }
      if (!caught401 || caught401.status !== 401) {
        throw new Error("Expected 401 error re-thrown cleanly.");
      }

      // 400 Bad Request
      let attempts400 = 0;
      const mock400Client = {
        models: {
          generateContent: async () => {
            attempts400++;
            const err = new Error("INVALID_ARGUMENT: Prompt contents cannot be empty");
            err.status = 400;
            throw err;
          },
        },
      };
      setAiClient(mock400Client);

      let caught400 = null;
      try {
        await callGeminiWithRetry(
          { model: "gemini-3.5-flash-lite", contents: "test" },
          { operationName: "test400FastFail", maxAttempts: 3 }
        );
      } catch (err) {
        caught400 = err;
      }

      if (attempts400 !== 1) {
        throw new Error(`Expected 400 to fail immediately on attempt 1, but ran ${attempts400} attempts!`);
      }
      console.log("PASS: Permanent errors (401, 400) failed immediately on attempt 1 without wasteful billable retries.");
    }

    // ----------------------------------------------------
    // TEST 7: Timeout Handling
    // ----------------------------------------------------
    console.log("\n--- TEST 7: Timeout Handling ---");
    {
      const mockHangingClient = {
        models: {
          generateContent: () => new Promise(() => {}), // Never resolves
        },
      };
      setAiClient(mockHangingClient);

      let timeoutError = null;
      try {
        await callGeminiWithRetry(
          { model: "gemini-3.5-flash-lite", contents: "test" },
          { operationName: "testTimeout", timeoutMs: 50, initialDelayMs: 10, maxAttempts: 2 }
        );
      } catch (err) {
        timeoutError = err;
      }

      if (!timeoutError) {
        throw new Error("Expected timeout error, but call did not timeout!");
      }
      if (timeoutError.code !== "ETIMEDOUT" || timeoutError.status !== 504) {
        throw new Error(`Expected ETIMEDOUT / 504, got ${timeoutError.code} / ${timeoutError.status}`);
      }
      console.log("PASS: Hanging request timed out deterministically with 504 ETIMEDOUT.");
    }

    // ----------------------------------------------------
    // TEST 8: Fix Behavioral-Question Count Interpolation Bug & generateQuestion
    // ----------------------------------------------------
    console.log("\n--- TEST 8: Behavioral Count Interpolation Bug & generateQuestion ---");
    {
      let capturedPrompt = "";
      const mockQuestionClient = {
        models: {
          generateContent: async (params) => {
            capturedPrompt = params.contents;
            return {
              text: JSON.stringify({
                question: "Describe a high-pressure situation where a project deadline was at risk.",
                category: "behavioral",
                topic: "Handling Pressure",
                reason: "Candidate has not demonstrated conflict or pressure management yet.",
              }),
            };
          },
        },
      };
      setAiClient(mockQuestionClient);

      const interviewData = {
        role: "Full Stack Developer",
        difficulty: "medium",
        jobDescription: "React, Node.js, MongoDB",
        resumeText: "Experienced developer",
        interviewPlan: {
          interviewStrategy: { primaryFocus: "technical", questionRange: { minimum: 15, maximum: 25 } },
          technical: { priority: "high", topics: ["Node.js"], targetDepth: "deep" },
          resumeBased: { priority: "medium", areas: ["Experience"], targetDepth: "moderate" },
          projectBased: { priority: "medium", projects: [] },
          problemSolving: { priority: "high", areas: ["DSA"], difficulty: "medium" },
          behavioral: { priority: "medium", competencies: ["pressure"], scenarioTypes: ["deadline"] },
        },
        conversation: [
          { question: "Q1", category: "behavioral" },
          { question: "Q2", category: "technical" },
          { question: "Q3", category: "behavioral" },
        ],
        currentQuestion: 4,
      };

      const result = await generateQuestion(interviewData);

      // Verify that the count was evaluated to "2", NOT "$(interview.conversation.filter...)"
      if (!capturedPrompt.includes("BEHAVIORAL QUESTION ASKED SO FAR:\n2") &&
          !capturedPrompt.includes("BEHAVIORAL QUESTION ASKED SO FAR:\r\n2")) {
        throw new Error(`Interpolation bug still present! Prompt was:\n${capturedPrompt.slice(0, 500)}`);
      }
      if (capturedPrompt.includes("$(interview.conversation")) {
        throw new Error("Prompt still contains raw $(...) un-interpolated JavaScript string!");
      }

      if (result.category !== "behavioral" || !result.question.includes("Describe")) {
        throw new Error("generateQuestion output invalid or failed schema validation!");
      }
      console.log("PASS: Interpolation bug fixed (count evaluated to 2); generateQuestion routed and validated.");
    }

    // ----------------------------------------------------
    // TEST 9: Markdown Fence Cleaning & Malformed JSON Protection
    // ----------------------------------------------------
    console.log("\n--- TEST 9: Markdown Fence Cleaning & Malformed JSON Handling ---");
    {
      const rawWithFences = "```json\n{\"test\": 123}\n```";
      const cleaned = parseCleanJsonResponse(rawWithFences, "testFences");
      if (cleaned.test !== 123) {
        throw new Error("Failed to strip markdown code fences!");
      }

      let jsonError = null;
      try {
        parseCleanJsonResponse("INVALID NOT JSON {{{", "testBadJson");
      } catch (err) {
        jsonError = err;
      }
      if (!jsonError || !jsonError.message.includes("Invalid JSON returned by Gemini")) {
        throw new Error("Expected clean structured error for malformed JSON.");
      }
      console.log("PASS: Markdown code fences stripped and malformed JSON caught cleanly.");
    }

    // ----------------------------------------------------
    // TEST 10: evaluateAnswer, generateFollowUp, generateFinalReport
    // ----------------------------------------------------
    console.log("\n--- TEST 10: evaluateAnswer, generateFollowUp, generateFinalReport with Mock Gemini ---");
    {
      // 1. evaluateAnswer
      setAiClient({
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              score: 85,
              evaluation: "Strong understanding of REST idempotency.",
              strengths: ["Clear terminology"],
              weaknesses: ["Could mention PUT vs PATCH"],
            }),
          }),
        },
      });

      const evalResult = await evaluateAnswer(
        { role: "Backend Developer", difficulty: "medium", jobDescription: "Node" },
        "What is idempotency?",
        "An operation that can be executed multiple times without changing the result."
      );
      if (evalResult.score !== 85 || evalResult.strengths.length === 0) {
        throw new Error("evaluateAnswer failed validation or output mismatch");
      }

      // 2. generateFollowUp
      setAiClient({
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              decision: "new_topic",
              question: "How do you handle indexing in MongoDB?",
              category: "technical",
              topic: "MongoDB Indexing",
              reason: "Sufficient evidence collected on idempotency.",
            }),
          }),
        },
      });

      const followUpResult = await generateFollowUp(
        {
          role: "Backend Developer",
          difficulty: "medium",
          jobDescription: "Node",
          conversation: [],
          interviewPlan: {},
        },
        "What is idempotency?",
        "Answer text",
        evalResult
      );
      if (followUpResult.decision !== "new_topic" || followUpResult.category !== "technical") {
        throw new Error("generateFollowUp failed validation or output mismatch");
      }

      // 3. generateFinalReport
      setAiClient({
        models: {
          generateContent: async () => ({
            text: JSON.stringify({
              overallScore: 88,
              strengths: ["Architecture", "System Design"],
              weaknesses: ["Concurrency edge cases"],
              recommendations: ["Review distributed locking"],
            }),
          }),
        },
      });

      const reportResult = await generateFinalReport({
        role: "Backend Developer",
        difficulty: "medium",
        jobDescription: "Node",
        conversation: [],
      });
      if (reportResult.overallScore !== 88 || reportResult.strengths.length !== 2) {
        throw new Error("generateFinalReport failed validation or output mismatch");
      }

      console.log("PASS: evaluateAnswer, generateFollowUp, and generateFinalReport all route and validate cleanly.");
    }

    console.log("\n==================================================");
    console.log("ALL 10 AI SERVICE UNIT & INTEGRATION TESTS PASSED!");
    console.log("==================================================");
  } finally {
    setAiClient(originalClient);
  }
}

runTestSuite().catch((err) => {
  console.error("AI Service Test Suite Failed:", err);
  process.exit(1);
});
