require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const connectDB = require("./src/db/db");
const app = require("./src/app");
const User = require("./src/models/user.model");
const RateLimit = require("./src/models/rateLimit.model");

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

async function runForgotPasswordTests() {
  console.log("=================================================");
  console.log("   PASSWORD RESET & ACCOUNT SECURITY TESTS       ");
  console.log("=================================================\n");

  const testEmail = `reset_test_${Date.now()}@example.com`;
  const initialPassword = "OldPassword123!";
  const newPassword = "NewStrongPassword456!";
  let testUser = null;

  try {
    await connectDB();
    console.log("Connected to MongoDB for test verification.\n");

    // Clean up test rate limit records to prevent test interference
    await RateLimit.deleteMany({ _id: { $regex: /password-reset/ } });

    // Create a verified test user
    testUser = await User.create({
      name: "Reset Tester",
      email: testEmail,
      password: initialPassword,
      isVerified: true,
    });
    console.log(`Created test user: ${testEmail}`);

    // -------------------------------------------------------------
    // TEST 1: Account Enumeration Prevention (Non-existent Email)
    // -------------------------------------------------------------
    console.log("\n[TEST 1] Testing account enumeration prevention for non-existent email...");
    const nonExistentRes = await simulateRequest({
      method: "POST",
      url: "/forgot-password",
      headers: { "x-forwarded-for": "192.168.10.1" },
      body: { email: "nobody_exists_here_999@example.com" },
    });

    console.log(`-> Response status: ${nonExistentRes.status}, message: "${nonExistentRes.body?.message}"`);
    if (nonExistentRes.status !== 200) {
      throw new Error(`Expected 200 OK, got ${nonExistentRes.status}`);
    }
    if (
      nonExistentRes.body?.message !==
      "If an account with that email exists, a password reset link has been sent."
    ) {
      throw new Error("Did not return standard generic message for non-existent email");
    }
    console.log("PASS: Generic response returned for non-existent email.");

    // -------------------------------------------------------------
    // TEST 2: Reset Request for Existing User & Token Hashing
    // -------------------------------------------------------------
    console.log("\n[TEST 2] Testing password reset request for existing user...");
    const existingRes = await simulateRequest({
      method: "POST",
      url: "/forgot-password",
      headers: { "x-forwarded-for": "192.168.10.2" },
      body: { email: testEmail },
    });

    console.log(`-> Response status: ${existingRes.status}, message: "${existingRes.body?.message}"`);
    if (existingRes.status !== 200) {
      throw new Error(`Expected 200 OK, got ${existingRes.status}`);
    }
    if (existingRes.body?.message !== nonExistentRes.body?.message) {
      throw new Error("Response message differs between existing and non-existent email (leakage!)");
    }

    // Inspect user in DB
    const dbUser = await User.findById(testUser._id);
    console.log(`-> Stored resetPasswordToken (length ${dbUser.resetPasswordToken?.length}): ${dbUser.resetPasswordToken}`);
    console.log(`-> Stored resetPasswordExpires: ${dbUser.resetPasswordExpires}`);

    if (!dbUser.resetPasswordToken) {
      throw new Error("resetPasswordToken was not saved in MongoDB");
    }
    // Verify it is a 64-char SHA-256 hex digest
    if (dbUser.resetPasswordToken.length !== 64) {
      throw new Error("Stored token is not a SHA-256 hash (expected 64 hex characters)");
    }
    if (!dbUser.resetPasswordExpires || dbUser.resetPasswordExpires <= new Date()) {
      throw new Error("resetPasswordExpires is missing or already expired");
    }
    console.log("PASS: Raw token was hashed before storing in MongoDB with a valid expiration.");

    // -------------------------------------------------------------
    // TEST 3: Invalid & Expired Token Rejection
    // -------------------------------------------------------------
    console.log("\n[TEST 3] Testing invalid and expired tokens...");
    
    // Invalid token
    const invalidTokenRes = await simulateRequest({
      method: "POST",
      url: "/reset-password/fake-random-invalid-token",
      headers: { "x-forwarded-for": "192.168.10.3" },
      body: { password: newPassword },
    });
    console.log(`-> Invalid token response: status = ${invalidTokenRes.status}, message = "${invalidTokenRes.body?.message}"`);
    if (invalidTokenRes.status !== 400) {
      throw new Error(`Expected 400 for invalid token, got ${invalidTokenRes.status}`);
    }

    // Short password rejection
    const shortPassRes = await simulateRequest({
      method: "POST",
      url: "/reset-password/fake-token",
      headers: { "x-forwarded-for": "192.168.10.4" },
      body: { password: "123" },
    });
    console.log(`-> Short password response: status = ${shortPassRes.status}`);
    if (shortPassRes.status !== 400) {
      throw new Error(`Expected 400 for short password, got ${shortPassRes.status}`);
    }

    // Expired token test: manually set expiration to the past
    const rawTokenForExpiry = "my-secret-test-token-to-expire-123456";
    const hashedTokenForExpiry = crypto.createHash("sha256").update(rawTokenForExpiry).digest("hex");
    await User.findByIdAndUpdate(testUser._id, {
      resetPasswordToken: hashedTokenForExpiry,
      resetPasswordExpires: new Date(Date.now() - 1000), // Expired 1 second ago
    });

    const expiredRes = await simulateRequest({
      method: "POST",
      url: `/reset-password/${rawTokenForExpiry}`,
      headers: { "x-forwarded-for": "192.168.10.5" },
      body: { password: newPassword },
    });
    console.log(`-> Expired token response: status = ${expiredRes.status}, message = "${expiredRes.body?.message}"`);
    if (expiredRes.status !== 400) {
      throw new Error(`Expected 400 for expired token, got ${expiredRes.status}`);
    }
    console.log("PASS: Invalid and expired tokens are rejected safely.");

    // -------------------------------------------------------------
    // TEST 4: Valid Token Consumption & Bcrypt Password Reset
    // -------------------------------------------------------------
    console.log("\n[TEST 4] Testing valid password reset & single-use token consumption...");
    
    // Issue a fresh valid token
    const rawValidToken = crypto.randomBytes(32).toString("hex");
    const hashedValidToken = crypto.createHash("sha256").update(rawValidToken).digest("hex");
    await User.findByIdAndUpdate(testUser._id, {
      resetPasswordToken: hashedValidToken,
      resetPasswordExpires: new Date(Date.now() + 3600000),
    });

    // Also issue a JWT for this user before password change (to test session invalidation later)
    const oldJwt = jwt.sign(
      { userId: testUser._id.toString(), email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    // Sleep 1.1s so token iat < passwordChangedAt timestamp
    await new Promise((r) => setTimeout(r, 1100));

    const resetSuccessRes = await simulateRequest({
      method: "POST",
      url: `/reset-password/${rawValidToken}`,
      headers: { "x-forwarded-for": "192.168.10.6" },
      body: { password: newPassword },
    });

    console.log(`-> Reset response: status = ${resetSuccessRes.status}, message = "${resetSuccessRes.body?.message}"`);
    if (resetSuccessRes.status !== 200) {
      throw new Error(`Expected 200 OK for valid reset, got ${resetSuccessRes.status}`);
    }

    // Verify user in DB
    const userAfterReset = await User.findById(testUser._id);
    console.log(`-> User resetPasswordToken: ${userAfterReset.resetPasswordToken}`);
    console.log(`-> User resetPasswordExpires: ${userAfterReset.resetPasswordExpires}`);
    console.log(`-> User passwordChangedAt: ${userAfterReset.passwordChangedAt}`);

    // Verify single-use: token must be cleared
    if (userAfterReset.resetPasswordToken || userAfterReset.resetPasswordExpires) {
      throw new Error("Reset token was not cleared after use (not single-use!)");
    }

    // Verify bcrypt hashing of new password
    const isNewPasswordValid = await bcrypt.compare(newPassword, userAfterReset.password);
    const isOldPasswordStillValid = await bcrypt.compare(initialPassword, userAfterReset.password);
    if (!isNewPasswordValid) {
      throw new Error("New password was not properly hashed with bcrypt");
    }
    if (isOldPasswordStillValid) {
      throw new Error("Old password still works after reset!");
    }
    console.log("PASS: Password was hashed with bcrypt and updated successfully.");

    // -------------------------------------------------------------
    // TEST 5: Single-Use Token: Attempt Reuse
    // -------------------------------------------------------------
    console.log("\n[TEST 5] Testing token reuse prevention...");
    const reuseRes = await simulateRequest({
      method: "POST",
      url: `/reset-password/${rawValidToken}`,
      headers: { "x-forwarded-for": "192.168.10.7" },
      body: { password: "AnotherPassword789!" },
    });

    console.log(`-> Reused token response: status = ${reuseRes.status}, message = "${reuseRes.body?.message}"`);
    if (reuseRes.status !== 400) {
      throw new Error(`Expected 400 for reused token, got ${reuseRes.status}`);
    }
    console.log("PASS: Reused token rejected successfully (single-use enforced).");

    // -------------------------------------------------------------
    // TEST 6: Session Invalidation
    // -------------------------------------------------------------
    console.log("\n[TEST 6] Testing invalidation of existing JWT sessions...");
    
    // Attempt to access a protected route with the pre-reset JWT
    const protectedOldRes = await simulateRequest({
      method: "GET",
      url: "/profile",
      headers: {
        authorization: `Bearer ${oldJwt}`,
      },
    });

    console.log(`-> Old token access: status = ${protectedOldRes.status}, message = "${protectedOldRes.body?.message}"`);
    if (protectedOldRes.status !== 401) {
      throw new Error(`Expected 401 for old session token, got ${protectedOldRes.status}`);
    }

    // Issue a NEW token after password change
    const newJwt = jwt.sign(
      { userId: testUser._id.toString(), email: testUser.email },
      process.env.JWT_SECRET,
      { expiresIn: "1h" }
    );

    const protectedNewRes = await simulateRequest({
      method: "GET",
      url: "/profile",
      headers: {
        authorization: `Bearer ${newJwt}`,
      },
    });

    console.log(`-> New token access: status = ${protectedNewRes.status}`);
    if (protectedNewRes.status !== 200) {
      throw new Error(`Expected 200 for new session token, got ${protectedNewRes.status}`);
    }
    console.log("PASS: Pre-reset JWT sessions are invalidated; new JWT sessions work.");

    // -------------------------------------------------------------
    // TEST 7: Login with New Password
    // -------------------------------------------------------------
    console.log("\n[TEST 7] Testing login with new password...");
    const loginNewRes = await simulateRequest({
      method: "POST",
      url: "/login",
      headers: { "x-forwarded-for": "192.168.10.8" },
      body: { email: testEmail, password: newPassword },
    });

    console.log(`-> Login with new password: status = ${loginNewRes.status}`);
    if (loginNewRes.status !== 200 || !loginNewRes.body?.token) {
      throw new Error(`Expected 200 with token, got ${loginNewRes.status}`);
    }

    // Login with old password fails
    const loginOldRes = await simulateRequest({
      method: "POST",
      url: "/login",
      headers: { "x-forwarded-for": "192.168.10.9" },
      body: { email: testEmail, password: initialPassword },
    });

    console.log(`-> Login with old password: status = ${loginOldRes.status}`);
    if (loginOldRes.status !== 400 && loginOldRes.status !== 401) {
      throw new Error("Old password unexpectedly succeeded at login");
    }
    console.log("PASS: Login with new password succeeded, old password rejected.");

    console.log("\n=================================================");
    console.log("   ALL PASSWORD RESET SECURITY TESTS PASSED      ");
    console.log("=================================================");
  } finally {
    if (testUser?._id) {
      await User.findByIdAndDelete(testUser._id);
      console.log("Cleaned up test user.");
    }
    await RateLimit.deleteMany({ _id: { $regex: /password-reset/ } });
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runForgotPasswordTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
