require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const connectDB = require("./src/db/db");
const app = require("./src/app");
const RateLimit = require("./src/models/rateLimit.model");
const { MongoRateLimitStore, RedisRateLimitStore } = require("./src/services/rateLimitStore");
const { createRateLimiter } = require("./src/middleware/rateLimiter.middleware");

// Helper to simulate HTTP requests against Express app without starting network port
function simulateRequest(options) {
  return new Promise((resolve) => {
    const {
      method = "GET",
      url = "/",
      headers = {},
      body = {},
    } = options;

    const req = {
      method,
      url,
      path: url.split("?")[0],
      headers: { ...headers },
      body,
      query: {},
      ip: headers["x-forwarded-for"] || "127.0.0.1",
      socket: { remoteAddress: headers["x-forwarded-for"] || "127.0.0.1" },
    };

    const resHeaders = {};
    let statusCode = 200;
    let resBody = null;

    const res = {
      statusCode: 200,
      setHeader(name, value) {
        resHeaders[name.toLowerCase()] = value;
      },
      getHeader(name) {
        return resHeaders[name.toLowerCase()];
      },
      status(code) {
        statusCode = code;
        this.statusCode = code;
        return this;
      },
      json(data) {
        resBody = data;
        resolve({ status: statusCode, headers: resHeaders, body: resBody });
        return this;
      },
      send(data) {
        resBody = data;
        resolve({ status: statusCode, headers: resHeaders, body: resBody });
        return this;
      },
      end() {
        resolve({ status: statusCode, headers: resHeaders, body: resBody });
      },
    };

    app.handle(req, res);
  });
}

async function runRateLimitTests() {
  console.log("=================================================");
  console.log("       DISTRIBUTED API RATE LIMITING TESTS       ");
  console.log("=================================================\n");

  try {
    await connectDB();
    console.log("Connected to MongoDB for rate limiting verification.\n");

    // Clean up any test rate-limit keys
    await RateLimit.deleteMany({ _id: { $regex: /^rl:test:/ } });

    // -------------------------------------------------------------
    // TEST 1: Unit Test MongoRateLimitStore
    // -------------------------------------------------------------
    console.log("[TEST 1] Testing MongoRateLimitStore atomic increment & TTL...");
    const store = new MongoRateLimitStore();
    const testKey = `rl:test:unit:${Date.now()}`;

    const r1 = await store.increment(testKey, 2);
    console.log(`-> First call: hits = ${r1.totalHits}, remainingSeconds = ${r1.remainingSeconds}`);
    if (r1.totalHits !== 1 || r1.remainingSeconds <= 0) {
      throw new Error(`Expected totalHits=1, got ${r1.totalHits}`);
    }

    const r2 = await store.increment(testKey, 2);
    console.log(`-> Second call: hits = ${r2.totalHits}, remainingSeconds = ${r2.remainingSeconds}`);
    if (r2.totalHits !== 2) {
      throw new Error(`Expected totalHits=2, got ${r2.totalHits}`);
    }

    // Verify record in database
    const dbRecord = await RateLimit.findById(testKey);
    if (!dbRecord || dbRecord.hits !== 2) {
      throw new Error("Expected database record with hits = 2");
    }

    // Wait 2.1s for window to expire
    console.log("-> Waiting for 2s window expiration...");
    await new Promise((r) => setTimeout(r, 2200));

    const r3 = await store.increment(testKey, 2);
    console.log(`-> After expiration call: hits = ${r3.totalHits} (reset to 1)`);
    if (r3.totalHits !== 1) {
      throw new Error(`Expected hits to reset to 1 after expiration, got ${r3.totalHits}`);
    }

    await store.reset(testKey);
    console.log("PASS: MongoRateLimitStore operates atomically with correct window resets.\n");

    // -------------------------------------------------------------
    // TEST 2: Registration Limiter (5 requests per 15 min per IP)
    // -------------------------------------------------------------
    console.log("[TEST 2] Testing /register rate limiting (max 5 hits)...");
    const testIp = `192.168.1.${Math.floor(Math.random() * 200) + 10}`;

    // Make 5 requests (should not be 429)
    for (let i = 1; i <= 5; i++) {
      const res = await simulateRequest({
        method: "POST",
        url: "/register",
        headers: { "x-forwarded-for": testIp },
        body: {}, // empty body triggers 400 validation, but consumes rate limit hit
      });

      console.log(`-> Request ${i}: status = ${res.status}, RateLimit-Remaining = ${res.headers["ratelimit-remaining"]}`);
      if (res.status === 429) {
        throw new Error(`Request ${i} was unexpectedly rate-limited (429)`);
      }
      if (res.headers["ratelimit-limit"] !== 5) {
        throw new Error(`Expected RateLimit-Limit header = 5, got ${res.headers["ratelimit-limit"]}`);
      }
    }

    // 6th request should be 429 Too Many Requests
    const resBlocked = await simulateRequest({
      method: "POST",
      url: "/register",
      headers: { "x-forwarded-for": testIp },
      body: {},
    });

    console.log(`-> 6th Request: status = ${resBlocked.status}, Retry-After = ${resBlocked.headers["retry-after"]}`);
    console.log(`-> Response body:`, resBlocked.body);

    if (resBlocked.status !== 429) {
      throw new Error(`Expected status 429, got ${resBlocked.status}`);
    }
    if (!resBlocked.headers["retry-after"]) {
      throw new Error("Expected Retry-After header on 429 response");
    }
    if (!resBlocked.body?.retryAfter) {
      throw new Error("Expected retryAfter in response body");
    }

    // A different IP should NOT be blocked
    const resDifferentIp = await simulateRequest({
      method: "POST",
      url: "/register",
      headers: { "x-forwarded-for": "10.0.0.99" },
      body: {},
    });
    console.log(`-> Different IP Request: status = ${resDifferentIp.status}`);
    if (resDifferentIp.status === 429) {
      throw new Error("Different IP was incorrectly blocked by rate limiter!");
    }

    console.log("PASS: Registration rate limiting successfully enforces 5-request limit with 429 and Retry-After.\n");

    // -------------------------------------------------------------
    // TEST 3: Login Limiter (Per IP / Email combination)
    // -------------------------------------------------------------
    console.log("[TEST 3] Testing /login rate limiting...");
    const loginIp = `192.168.2.${Math.floor(Math.random() * 200) + 10}`;
    const targetEmail = "candidate@example.com";

    for (let i = 1; i <= 5; i++) {
      const res = await simulateRequest({
        method: "POST",
        url: "/login",
        headers: { "x-forwarded-for": loginIp },
        body: { email: targetEmail, password: "wrong-password" },
      });
      if (res.status === 429) {
        throw new Error(`Login attempt ${i} was unexpectedly rate-limited`);
      }
    }

    // 6th attempt with same email/IP should be 429
    const loginBlocked = await simulateRequest({
      method: "POST",
      url: "/login",
      headers: { "x-forwarded-for": loginIp },
      body: { email: targetEmail, password: "wrong-password" },
    });

    console.log(`-> 6th Login Attempt: status = ${loginBlocked.status}, Retry-After = ${loginBlocked.headers["retry-after"]}`);
    if (loginBlocked.status !== 429) {
      throw new Error(`Expected 429 on 6th login attempt, got ${loginBlocked.status}`);
    }

    console.log("PASS: Login rate limiting successfully protects against brute force attacks.\n");

    // -------------------------------------------------------------
    // TEST 4: Normal GET Requests are NOT Restricted
    // -------------------------------------------------------------
    console.log("[TEST 4] Verifying normal GET requests are not restricted...");
    const getRes1 = await simulateRequest({ method: "GET", url: "/" });
    const getRes2 = await simulateRequest({ method: "GET", url: "/" });

    if (getRes1.status !== 200 || getRes2.status !== 200) {
      throw new Error("GET / was unexpectedly blocked or errored");
    }
    console.log("PASS: Public GET endpoints remain accessible without tight restriction.\n");

    // -------------------------------------------------------------
    // TEST 5: Authenticated User-Based Rate Limiting
    // -------------------------------------------------------------
    console.log("[TEST 5] Testing authenticated user-based limiter...");
    const userStore = new MongoRateLimitStore();
    const userLimiter = createRateLimiter({
      prefix: "rl:test:auth",
      windowSeconds: 60,
      maxHits: 2,
      keyGenerator: (req) => req.user?.userId || "anon",
      customStore: userStore,
    });

    let middlewareStatus = 200;
    let middlewareHeaders = {};

    function runUserLimiter(userId) {
      return new Promise((resolve) => {
        const req = {
          user: { userId },
          headers: {},
        };
        const res = {
          setHeader(k, v) { middlewareHeaders[k.toLowerCase()] = v; },
          status(c) { middlewareStatus = c; return this; },
          json(b) { resolve({ status: middlewareStatus, headers: middlewareHeaders, body: b }); },
        };
        const next = () => resolve({ status: 200, headers: middlewareHeaders });
        userLimiter(req, res, next);
      });
    }

    // User A hits limit
    const u1 = await runUserLimiter("userA");
    const u2 = await runUserLimiter("userA");
    const u3 = await runUserLimiter("userA"); // Should be 429

    console.log(`-> User A 3rd request: status = ${u3.status}`);
    if (u3.status !== 429) {
      throw new Error(`Expected User A 3rd request to be 429, got ${u3.status}`);
    }

    // User B should NOT be blocked
    const ub1 = await runUserLimiter("userB");
    console.log(`-> User B 1st request: status = ${ub1.status}`);
    if (ub1.status !== 200) {
      throw new Error(`Expected User B to succeed with 200, got ${ub1.status}`);
    }

    console.log("PASS: User-based rate limiting correctly isolates quotas per authenticated user.\n");

    console.log("=================================================");
    console.log("   ALL DISTRIBUTED RATE LIMITING TESTS PASSED    ");
    console.log("=================================================");
  } finally {
    // Cleanup test keys
    await RateLimit.deleteMany({ _id: { $regex: /^rl:test:/ } });
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runRateLimitTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
