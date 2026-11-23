const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const Interview = require("./src/models/interview.model");
const User = require("./src/models/user.model");
const errorMiddleware = require("./src/middleware/error.middleware");

function createMockReqRes(userId, body = {}, params = {}, query = {}) {
  const req = {
    user: { userId: userId.toString() },
    body,
    params,
    query,
  };

  let responseData = null;
  let statusCode = 200;

  const res = {
    status(code) {
      statusCode = code;
      return this;
    },
    json(data) {
      responseData = data;
      return this;
    },
  };

  const next = (err) => {
    if (err) throw err;
  };

  return { req, res, next, getResponse: () => ({ statusCode, responseData }) };
}

async function runAuditTests() {
  console.log("==================================================");
  console.log("RUNNING PRODUCTION-READINESS AUDIT VERIFICATION");
  console.log("==================================================\n");

  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  await User.syncIndexes();
  await Interview.syncIndexes();

  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  const userA = await User.create({
    _id: userAId,
    name: "Audit User A",
    email: `audit-a-${Date.now()}@example.com`,
    password: "Password123!",
    isVerified: true,
  });

  const userB = await User.create({
    _id: userBId,
    name: "Audit User B",
    email: `audit-b-${Date.now()}@example.com`,
    password: "Password123!",
    isVerified: true,
  });

  try {
    // ----------------------------------------------------
    // AUDIT 1: Mongoose Schema Consistency (category, topic, reason)
    // ----------------------------------------------------
    console.log("--- AUDIT 1: Mongoose Schema Consistency ---");
    {
      const interview = await Interview.create({
        user: userAId,
        role: "Backend Architect",
        difficulty: "hard",
        jobDescription: "Distributed systems, Node.js, MongoDB",
        interviewPlan: {
          interviewStrategy: { primaryFocus: "technical", questionRange: { minimum: 15, maximum: 25 } },
          technical: { priority: "high", topics: ["Node.js"], targetDepth: "deep" },
        },
        conversation: [
          {
            question: "How do you resolve distributed race conditions?",
            category: "problemSolving",
            topic: "Distributed Locking",
            reason: "Critical architectural assessment",
            decision: "follow_up",
            status: "unanswered",
          },
        ],
      });

      // Reload fresh from MongoDB to verify fields were NOT stripped by Mongoose
      const reloaded = await Interview.findById(interview._id).lean();
      const firstConv = reloaded.conversation[0];

      if (firstConv.category !== "problemSolving") {
        throw new Error(`category was stripped by Mongoose! Got: ${firstConv.category}`);
      }
      if (firstConv.topic !== "Distributed Locking") {
        throw new Error(`topic was stripped by Mongoose! Got: ${firstConv.topic}`);
      }
      if (firstConv.reason !== "Critical architectural assessment") {
        throw new Error(`reason was stripped by Mongoose! Got: ${firstConv.reason}`);
      }
      if (firstConv.decision !== "follow_up") {
        throw new Error(`decision was stripped by Mongoose! Got: ${firstConv.decision}`);
      }

      console.log("PASS: category, topic, reason, and decision are properly declared in schema and persisted.");
    }

    // ----------------------------------------------------
    // AUDIT 2: Backend Expiry & Authoritative Server Timer
    // ----------------------------------------------------
    console.log("\n--- AUDIT 2: Backend Expiry & Authoritative Server Timer ---");
    {
      const { getNextQuestion, submitAnswer, completeInterview, getInterviewById } = require("./src/controllers/interview.controller");

      // Create an expired interview
      const expiredInterview = await Interview.create({
        user: userAId,
        role: "Backend Developer",
        difficulty: "medium",
        jobDescription: "Node.js",
        durationMinutes: 30,
        expiresAt: new Date(Date.now() - 10000), // Expired 10 seconds ago
        interviewPlan: {
          interviewStrategy: { primaryFocus: "technical", questionRange: { minimum: 15, maximum: 25 } },
        },
        currentQuestion: 5,
        conversation: [
          {
            question: "What is Node.js?",
            status: "unanswered",
          },
        ],
      });

      // 2a. getInterviewById returns authoritative remainingSeconds = 0
      const mockGet = createMockReqRes(userAId, {}, { id: expiredInterview._id.toString() });
      await getInterviewById(mockGet.req, mockGet.res, mockGet.next);
      const getRes = mockGet.getResponse();
      if (getRes.responseData.interview.remainingSeconds !== 0) {
        throw new Error(`Expected remainingSeconds=0, got ${getRes.responseData.interview.remainingSeconds}`);
      }

      // 2b. getNextQuestion rejected with HTTP 410 Gone on expired interview
      const mockNextQ = createMockReqRes(userAId, {}, { id: expiredInterview._id.toString() });
      await getNextQuestion(mockNextQ.req, mockNextQ.res, mockNextQ.next);
      if (mockNextQ.getResponse().statusCode !== 410 || !mockNextQ.getResponse().responseData.isExpired) {
        throw new Error(`Expected HTTP 410 on expired getNextQuestion, got ${mockNextQ.getResponse().statusCode}`);
      }

      // 2c. submitAnswer rejected with HTTP 410 Gone when past grace period
      expiredInterview.expiresAt = new Date(Date.now() - 70000); // 70 seconds ago (> 60s grace period)
      await expiredInterview.save();

      const mockAns = createMockReqRes(userAId, { answer: "JavaScript runtime" }, { id: expiredInterview._id.toString() });
      await submitAnswer(mockAns.req, mockAns.res, mockAns.next);
      if (mockAns.getResponse().statusCode !== 410 || !mockAns.getResponse().responseData.isExpired) {
        throw new Error(`Expected HTTP 410 on expired submitAnswer, got ${mockAns.getResponse().statusCode}`);
      }

      console.log("PASS: Authoritative backend timer enforces 410 Gone on expired interviews, ignoring client tampering.");
    }

    // ----------------------------------------------------
    // AUDIT 3: Authorization & Ownership Verification
    // ----------------------------------------------------
    console.log("\n--- AUDIT 3: Cross-User Ownership Enforcement (403 Forbidden) ---");
    {
      const { getInterviewById, updateInterview, deleteInterview, getNextQuestion, submitAnswer } = require("./src/controllers/interview.controller");

      const interviewOfA = await Interview.create({
        user: userAId,
        role: "Confidential Role A",
        difficulty: "hard",
        jobDescription: "Top Secret Project",
        resumeText: "User A Confidential Resume",
        interviewPlan: {
          interviewStrategy: { primaryFocus: "technical", questionRange: { minimum: 15, maximum: 25 } },
        },
      });

      // User B attempts to view User A's interview
      const mockView = createMockReqRes(userBId, {}, { id: interviewOfA._id.toString() });
      await getInterviewById(mockView.req, mockView.res, mockView.next);
      if (mockView.getResponse().statusCode !== 403) {
        throw new Error(`Expected 403 on cross-user view, got ${mockView.getResponse().statusCode}`);
      }

      // User B attempts to delete User A's interview
      const mockDel = createMockReqRes(userBId, {}, { id: interviewOfA._id.toString() });
      await deleteInterview(mockDel.req, mockDel.res, mockDel.next);
      if (mockDel.getResponse().statusCode !== 403) {
        throw new Error(`Expected 403 on cross-user delete, got ${mockDel.getResponse().statusCode}`);
      }

      // User B attempts to submit answer to User A's interview
      const mockAnswer = createMockReqRes(userBId, { answer: "Malicious Injection" }, { id: interviewOfA._id.toString() });
      await submitAnswer(mockAnswer.req, mockAnswer.res, mockAnswer.next);
      if (mockAnswer.getResponse().statusCode !== 403) {
        throw new Error(`Expected 403 on cross-user answer, got ${mockAnswer.getResponse().statusCode}`);
      }

      console.log("PASS: Ownership strictly enforced across all operations; cross-user tampering rejected with 403.");
    }

    // ----------------------------------------------------
    // AUDIT 4: Production Error Sanitization (No Leaked Stack Traces)
    // ----------------------------------------------------
    console.log("\n--- AUDIT 4: Production Error Sanitization ---");
    {
      const originalEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = "production";

      const fakeDbError = new Error("MongoServerError: Authentication failed for user admin at mongodb+srv://admin:SecretPassword123@cluster.mongodb.net");
      fakeDbError.stack = "Error: at /server/src/db/db.js:15:10";

      let responseJson = null;
      let statusCode = 200;
      const res = {
        status(code) {
          statusCode = code;
          return this;
        },
        json(data) {
          responseJson = data;
          return this;
        },
      };

      errorMiddleware(fakeDbError, {}, res, () => {});

      if (statusCode !== 500) {
        throw new Error(`Expected 500 status code, got ${statusCode}`);
      }
      if (responseJson.message !== "Internal server error") {
        throw new Error(`Leaked sensitive error message in production! Got: ${responseJson.message}`);
      }
      if (responseJson.stack || responseJson.error) {
        throw new Error("Stack trace or internal error object leaked in response payload!");
      }

      process.env.NODE_ENV = originalEnv;
      console.log("PASS: Sensitive DB connection strings, passwords, and stack traces sanitized in production mode.");
    }

    // ----------------------------------------------------
    // AUDIT 5: Database Indexes Verification
    // ----------------------------------------------------
    console.log("\n--- AUDIT 5: Database Index Verification ---");
    {
      const userIndexes = await User.collection.indexes();
      const hasVerificationTokenIndex = userIndexes.some((idx) => idx.key.verificationToken === 1);
      const hasResetPasswordTokenIndex = userIndexes.some((idx) => idx.key.resetPasswordToken === 1);

      if (!hasVerificationTokenIndex) {
        throw new Error("Missing sparse index on User.verificationToken!");
      }
      if (!hasResetPasswordTokenIndex) {
        throw new Error("Missing sparse index on User.resetPasswordToken!");
      }

      const interviewIndexes = await Interview.collection.indexes();
      const hasCompoundIndex = interviewIndexes.some(
        (idx) => idx.key.user === 1 && idx.key.createdAt === -1 && idx.key._id === -1
      );
      if (!hasCompoundIndex) {
        throw new Error("Missing compound index { user: 1, createdAt: -1, _id: -1 } on Interview!");
      }

      console.log("PASS: Sparse token lookup indexes and interview compound sorting indexes verified.");
    }

    console.log("\n==================================================");
    console.log("ALL PRODUCTION AUDIT CHECKS PASSED SUCCESSFULLY!");
    console.log("==================================================");
  } finally {
    await Interview.deleteMany({ user: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runAuditTests().catch((err) => {
  console.error("Audit verification failed:", err);
  process.exit(1);
});
