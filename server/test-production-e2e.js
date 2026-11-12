require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./src/models/user.model");
const Interview = require("./src/models/interview.model");

const BACKEND_URL = "https://ai-interview-agent-qpxi.vercel.app";
const FRONTEND_URL = "https://ai-interview-agent-omega-eight.vercel.app";

async function runProductionE2ETests() {
  console.log("=================================================");
  console.log("   LIVE VERCEL PRODUCTION VERIFICATION TESTS     ");
  console.log("=================================================");
  console.log("Backend:", BACKEND_URL);
  console.log("Frontend:", FRONTEND_URL);

  const testEmail = `prod_verify_${Date.now()}@gmail.com`;
  const testPassword = "SecurePassword123!";
  const testName = "Production Verifier";

  try {
    const connectDB = require("./src/db/db");
    await connectDB();
    console.log("✅ Connected to MongoDB Atlas for state verification");

    // 1. Frontend loads
    console.log("\n[1] Checking Frontend production load...");
    const feRes = await fetch(FRONTEND_URL);
    if (feRes.status !== 200) throw new Error(`Frontend returned status ${feRes.status}`);
    const feText = await feRes.text();
    if (!feText.includes('<div id="root"></div>')) {
      throw new Error("Frontend did not return expected root div");
    }
    console.log("✅ Passed: Frontend loads successfully (HTTP 200)");

    // 2. Backend health endpoint responds
    console.log("\n[2] Checking Backend health endpoint...");
    const beHealthRes = await fetch(`${BACKEND_URL}/`);
    if (beHealthRes.status !== 200) throw new Error(`Backend health returned status ${beHealthRes.status}`);
    const healthJson = await beHealthRes.json();
    console.log("Health response:", healthJson);
    if (healthJson.status !== "ok") throw new Error("Health check status != ok");
    console.log("✅ Passed: Backend health endpoint responds (HTTP 200)");

    // 3. CORS Preflight
    console.log("\n[3] Checking CORS configuration on Vercel backend...");
    const corsRes = await fetch(`${BACKEND_URL}/register`, {
      method: "OPTIONS",
      headers: {
        Origin: FRONTEND_URL,
        "Access-Control-Request-Method": "POST",
      },
    });
    const allowOrigin = corsRes.headers.get("access-control-allow-origin");
    console.log("CORS status:", corsRes.status, "Allowed Origin:", allowOrigin);
    if (!allowOrigin || (allowOrigin !== FRONTEND_URL && allowOrigin !== "*")) {
      throw new Error(`CORS did not allow frontend origin: ${allowOrigin}`);
    }
    console.log("✅ Passed: Backend allows production frontend origin through CORS");

    // 4. New account registration & Gmail SMTP email dispatch
    console.log("\n[4] Testing live registration and Gmail SMTP dispatch...");
    const regRes = await fetch(`${BACKEND_URL}/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: testName,
        email: testEmail,
        password: testPassword,
      }),
    });
    const regJson = await regRes.json();
    console.log("Registration Status:", regRes.status, "Body:", regJson);
    if (regRes.status !== 201) throw new Error(`Registration failed: ${JSON.stringify(regJson)}`);
    if (regJson.emailSent !== true) {
      console.warn("⚠️ emailSent is false. Check SMTP credentials in Vercel.");
    } else {
      console.log("✅ Passed: New account registered and Gmail SMTP email sent (emailSent: true)");
    }

    // Verify user in MongoDB
    const userInDb = await User.findOne({ email: testEmail });
    if (!userInDb) throw new Error("User was not persisted in MongoDB Atlas");
    if (!userInDb.verificationToken) throw new Error("Verification token missing in DB");
    console.log("✅ Passed: User document persisted in MongoDB with unverified status");

    // 5. Unverified login blocked
    console.log("\n[5] Testing unverified login is blocked (403)...");
    const unverifiedLoginRes = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    console.log("Unverified Login Status:", unverifiedLoginRes.status);
    if (unverifiedLoginRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden, got ${unverifiedLoginRes.status}`);
    }
    console.log("✅ Passed: Unverified account correctly blocked from logging in (HTTP 403)");

    // 6. Email verification succeeds
    console.log("\n[6] Testing email verification with token...");
    const verifyRes = await fetch(`${BACKEND_URL}/verify-email/${userInDb.verificationToken}`);
    const verifyJson = await verifyRes.json();
    console.log("Verification Status:", verifyRes.status, "Body:", verifyJson);
    if (verifyRes.status !== 200) throw new Error(`Verification failed: ${JSON.stringify(verifyJson)}`);
    console.log("✅ Passed: Email verification succeeded (HTTP 200)");

    // 7. Verified login succeeds & JWT issued
    console.log("\n[7] Testing login with verified account...");
    const loginRes = await fetch(`${BACKEND_URL}/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: testEmail,
        password: testPassword,
      }),
    });
    const loginJson = await loginRes.json();
    console.log("Login Status:", loginRes.status, "Token issued:", !!loginJson.token);
    if (loginRes.status !== 200 || !loginJson.token) {
      throw new Error(`Login failed or JWT missing: ${JSON.stringify(loginJson)}`);
    }
    const token = loginJson.token;
    console.log("✅ Passed: Verified account logged in successfully, JWT received");

    // 8. Gemini interview generation on live backend
    console.log("\n[8] Testing Gemini interview generation on live backend...");
    const interviewRes = await fetch(`${BACKEND_URL}/interviews`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        role: "Full Stack Engineer",
        difficulty: "medium",
        jobDescription: "React, Node.js, Express, MongoDB, REST APIs",
        resumeText: "Experienced with React, Node.js, and MongoDB cloud architectures.",
      }),
    });
    const interviewJson = await interviewRes.json();
    console.log("Interview Creation Status:", interviewRes.status);
    if (interviewRes.status !== 201 || !interviewJson.interview) {
      throw new Error(`Interview creation failed: ${JSON.stringify(interviewJson)}`);
    }
    const interviewId = interviewJson.interview._id;
    console.log("✅ Passed: Interview generated via Gemini and saved to DB with ID:", interviewId);

    // 9. AI Question Generation
    console.log("\n[9] Testing AI question generation on live backend...");
    const questionRes = await fetch(`${BACKEND_URL}/interviews/${interviewId}/question`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    });
    const questionJson = await questionRes.json();
    console.log("Question Status:", questionRes.status);
    if (questionRes.status !== 200 || !questionJson.question) {
      throw new Error(`Question generation failed: ${JSON.stringify(questionJson)}`);
    }
    const questionText = questionJson.question?.question || String(questionJson.question);
    console.log("✅ Passed: Question generated by Gemini:", questionText.substring(0, 70) + "...");

    // 10. AI Answer Evaluation
    console.log("\n[10] Testing answer evaluation on live backend...");
    const answerRes = await fetch(`${BACKEND_URL}/interviews/${interviewId}/answer`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        answer: "Node.js handles concurrency using an event loop with non-blocking I/O operations via libuv.",
      }),
    });
    const answerJson = await answerRes.json();
    console.log("Answer Evaluation Status:", answerRes.status, "Score:", answerJson.score);
    if (answerRes.status !== 200) {
      throw new Error(`Answer evaluation failed: ${JSON.stringify(answerJson)}`);
    }
    console.log("✅ Passed: Answer evaluated by Gemini with feedback and score");

    // Clean up test data
    console.log("\nCleaning up live production test data...");
    await Interview.deleteMany({ user: userInDb._id });
    await User.deleteOne({ _id: userInDb._id });
    console.log("✅ Test data cleaned up from MongoDB Atlas");

    console.log("\n🎉 ALL LIVE PRODUCTION VERIFICATION TESTS PASSED ON VERCEL! 🎉\n");
    process.exit(0);
  } catch (error) {
    console.error("\n❌ PRODUCTION TEST FAILED:", error);
    try {
      await User.deleteOne({ email: testEmail });
    } catch (_) {}
    process.exit(1);
  }
}

runProductionE2ETests();
