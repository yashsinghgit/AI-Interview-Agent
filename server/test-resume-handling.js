require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const connectDB = require("./src/db/db");
const app = require("./src/app");
const User = require("./src/models/user.model");
const Interview = require("./src/models/interview.model");
const aiService = require("./src/services/ai.service");

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

async function runResumeHandlingTests() {
  console.log("=================================================");
  console.log("    RESUME HANDLING, PRIVACY & RETENTION TESTS   ");
  console.log("=================================================\n");

  const originalGenerateInterviewPlan = aiService.generateInterviewPlan;

  // Mock AI interview plan generation to avoid live Gemini API delays during testing
  aiService.generateInterviewPlan = async () => ({
    interviewStrategy: {
      primaryFocus: "technical",
      questionRange: { minimum: 15, maximum: 20 },
    },
    technical: { priority: "high", topics: ["Node.js", "Security"], targetDepth: "deep" },
    resumeBased: { priority: "medium", areas: ["Backend Architecture"], targetDepth: "moderate" },
    projectBased: { priority: "medium", projects: [] },
    problemSolving: { priority: "medium", areas: ["Algorithms"], difficulty: "medium" },
    behavioral: { priority: "medium", competencies: ["Ownership"], scenarioTypes: ["Conflict"] },
  });

  const userA_Id = new mongoose.Types.ObjectId();
  const userB_Id = new mongoose.Types.ObjectId();

  const tokenA = jwt.sign(
    { userId: userA_Id.toString(), email: "userA@example.com" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  const tokenB = jwt.sign(
    { userId: userB_Id.toString(), email: "userB@example.com" },
    process.env.JWT_SECRET,
    { expiresIn: "1h" }
  );

  let createdInterviewId = null;

  try {
    await connectDB();
    console.log("Connected to MongoDB for resume handling verification.\n");

    // -------------------------------------------------------------
    // TEST 1: Oversized Resume Text (> 50,000 characters)
    // -------------------------------------------------------------
    console.log("[TEST 1] Testing rejection of oversized resume text (> 50,000 chars)...");
    const oversizedResume = "A".repeat(50001);

    const oversizedRes = await simulateRequest({
      method: "POST",
      url: "/interviews",
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      body: {
        role: "Backend Engineer",
        difficulty: "medium",
        jobDescription: "Node.js development",
        resumeText: oversizedResume,
      },
    });

    console.log(`-> Oversized resume response: status = ${oversizedRes.status}, message = "${oversizedRes.body?.message}"`);
    if (oversizedRes.status !== 400) {
      throw new Error(`Expected 400 Bad Request for oversized resume, got ${oversizedRes.status}`);
    }
    console.log("PASS: Oversized resume text was rejected at the API boundary.\n");

    // -------------------------------------------------------------
    // TEST 2: Valid Resume Submission & Storage Isolation
    // -------------------------------------------------------------
    console.log("[TEST 2] Testing valid resume submission & user-scoped storage...");
    const validResume = "Software Engineer with 4 years of experience in Node.js, TypeScript, and MongoDB. Led microservices migration.";

    const createRes = await simulateRequest({
      method: "POST",
      url: "/interviews",
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
      body: {
        role: "Senior Node.js Developer",
        difficulty: "hard",
        jobDescription: "Build distributed backend services with high concurrency.",
        resumeText: validResume,
      },
    });

    console.log(`-> Create interview response: status = ${createRes.status}`);
    if (createRes.status !== 201 || !createRes.body?.interview?._id) {
      throw new Error(`Expected 201 Created with interview object, got ${createRes.status}`);
    }

    createdInterviewId = createRes.body.interview._id;

    // Verify User A can access their interview and resume
    const userAAccessRes = await simulateRequest({
      method: "GET",
      url: `/interviews/${createdInterviewId}`,
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
    });

    console.log(`-> User A access: status = ${userAAccessRes.status}, role = "${userAAccessRes.body?.interview?.role}"`);
    if (userAAccessRes.status !== 200 || userAAccessRes.body?.interview?.resumeText !== validResume) {
      throw new Error("User A could not access their own interview and resume text");
    }
    console.log("PASS: User A successfully created and retrieved their interview with resume text.\n");

    // -------------------------------------------------------------
    // TEST 3: Cross-User Access Prevention (Data Privacy / Infiltration)
    // -------------------------------------------------------------
    console.log("[TEST 3] Testing cross-user access prevention (User B accessing User A's resume)...");

    // User B attempts to read User A's interview
    const userBAccessRes = await simulateRequest({
      method: "GET",
      url: `/interviews/${createdInterviewId}`,
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
    });

    console.log(`-> User B GET attempt: status = ${userBAccessRes.status}, message = "${userBAccessRes.body?.message}"`);
    if (userBAccessRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden when User B tries to read User A's interview, got ${userBAccessRes.status}`);
    }

    // User B attempts to delete User A's interview
    const userBDeleteRes = await simulateRequest({
      method: "DELETE",
      url: `/interviews/${createdInterviewId}`,
      headers: {
        authorization: `Bearer ${tokenB}`,
      },
    });

    console.log(`-> User B DELETE attempt: status = ${userBDeleteRes.status}, message = "${userBDeleteRes.body?.message}"`);
    if (userBDeleteRes.status !== 403) {
      throw new Error(`Expected 403 Forbidden when User B tries to delete User A's interview, got ${userBDeleteRes.status}`);
    }
    console.log("PASS: Cross-user data isolation verified: User B cannot read or delete User A's resume data.\n");

    // -------------------------------------------------------------
    // TEST 4: Authorized Deletion & Complete Data Erasure (Right to be Forgotten)
    // -------------------------------------------------------------
    console.log("[TEST 4] Testing authorized deletion & permanent data erasure...");

    // User A deletes their interview
    const userADeleteRes = await simulateRequest({
      method: "DELETE",
      url: `/interviews/${createdInterviewId}`,
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
    });

    console.log(`-> User A DELETE response: status = ${userADeleteRes.status}, message = "${userADeleteRes.body?.message}"`);
    if (userADeleteRes.status !== 200) {
      throw new Error(`Expected 200 OK for delete, got ${userADeleteRes.status}`);
    }

    // Verify record is completely removed from MongoDB
    const docInDb = await Interview.findById(createdInterviewId);
    console.log(`-> Verified in MongoDB: docInDb = ${docInDb}`);
    if (docInDb !== null) {
      throw new Error("Interview document was not deleted from MongoDB!");
    }

    // Attempting to GET now returns 404
    const getDeletedRes = await simulateRequest({
      method: "GET",
      url: `/interviews/${createdInterviewId}`,
      headers: {
        authorization: `Bearer ${tokenA}`,
      },
    });

    console.log(`-> Subsequent GET status: ${getDeletedRes.status}`);
    if (getDeletedRes.status !== 404) {
      throw new Error(`Expected 404 Not Found after deletion, got ${getDeletedRes.status}`);
    }
    console.log("PASS: Interview and associated resume text were permanently erased upon user deletion.\n");

    console.log("=================================================");
    console.log("   ALL RESUME HANDLING & PRIVACY TESTS PASSED    ");
    console.log("=================================================");
  } finally {
    aiService.generateInterviewPlan = originalGenerateInterviewPlan;

    if (createdInterviewId) {
      await Interview.findByIdAndDelete(createdInterviewId);
    }

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runResumeHandlingTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
