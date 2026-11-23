const path = require("path");
require("dotenv").config({ path: path.join(__dirname, ".env") });
const mongoose = require("mongoose");
const Interview = require("./src/models/interview.model");
const User = require("./src/models/user.model");
const { getMyInterviews } = require("./src/controllers/interview.controller");

function createMockReqRes(userId, query = {}) {
  const req = {
    user: { userId: userId.toString() },
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

async function runTests() {
  console.log("Connecting to MongoDB...");
  await mongoose.connect(process.env.MONGODB_URI);
  console.log("Connected to MongoDB.");

  // Sync indexes
  await Interview.syncIndexes();
  const indexes = await Interview.collection.indexes();
  console.log("\n--- Verified MongoDB Indexes ---");
  indexes.forEach((idx) => console.log(`Index name: ${idx.name}, Keys:`, idx.key));

  const hasCompoundUserCreatedIndex = indexes.some(
    (idx) => idx.key.user === 1 && idx.key.createdAt === -1 && idx.key._id === -1
  );
  if (!hasCompoundUserCreatedIndex) {
    throw new Error("Missing compound index { user: 1, createdAt: -1, _id: -1 }");
  }
  console.log("Verified compound index { user: 1, createdAt: -1, _id: -1 } exists.");

  // Create two distinct test users
  const userAId = new mongoose.Types.ObjectId();
  const userBId = new mongoose.Types.ObjectId();

  const userA = await User.create({
    _id: userAId,
    name: "User Pagination A",
    email: `pagination-a-${Date.now()}@example.com`,
    password: "Password123!",
    isVerified: true,
  });

  const userB = await User.create({
    _id: userBId,
    name: "User Pagination B",
    email: `pagination-b-${Date.now()}@example.com`,
    password: "Password123!",
    isVerified: true,
  });

  console.log(`Created test User A: ${userA._id} and User B: ${userB._id}`);

  try {
    // Seed 15 interviews for User A
    // Mix completed and in-progress, with scores
    const userAInterviews = [];
    const now = Date.now();
    for (let i = 0; i < 15; i++) {
      const isCompleted = i % 2 === 0;
      userAInterviews.push({
        user: userAId,
        role: `Role User A #${i + 1}`,
        difficulty: "medium",
        jobDescription: `Job description for role ${i + 1}`,
        resumeText: `CONFIDENTIAL RESUME TEXT #${i + 1}`,
        conversation: [
          {
            question: `Question for role ${i + 1}`,
            answer: `Answer for role ${i + 1}`,
            evaluation: `Evaluation for role ${i + 1}`,
            score: isCompleted ? 80 + (i % 20) : null,
            status: isCompleted ? "answered" : "unanswered",
          },
        ],
        status: isCompleted ? "completed" : "in-progress",
        createdAt: new Date(now - i * 1000 * 60), // Each 1 minute apart
        finalReport: isCompleted
          ? {
              overallScore: 80 + (i % 20),
              strengths: ["Communication"],
              weaknesses: ["Speed"],
              recommendations: ["Practice"],
            }
          : undefined,
      });
    }
    await Interview.insertMany(userAInterviews);

    // Seed 5 interviews for User B
    const userBInterviews = [];
    for (let i = 0; i < 5; i++) {
      userBInterviews.push({
        user: userBId,
        role: `Role User B #${i + 1}`,
        difficulty: "hard",
        jobDescription: `Job description for user B role ${i + 1}`,
        resumeText: `CONFIDENTIAL USER B RESUME #${i + 1}`,
        conversation: [
          {
            question: `User B Question ${i + 1}`,
            answer: `User B Answer ${i + 1}`,
            status: "answered",
          },
        ],
        status: "completed",
        createdAt: new Date(now - i * 1000 * 60),
        finalReport: {
          overallScore: 90,
          strengths: ["System Design"],
          weaknesses: [],
          recommendations: [],
        },
      });
    }
    await Interview.insertMany(userBInterviews);

    console.log("Seeded 15 interviews for User A, 5 interviews for User B.\n");

    // ==========================================
    // TEST 1: Page Size & Metadata
    // ==========================================
    console.log("--- TEST 1: Page Size, Limit & Metadata ---");
    {
      const { req, res, next, getResponse } = createMockReqRes(userAId, { page: "1", limit: "5" });
      await getMyInterviews(req, res, next);
      const { statusCode, responseData } = getResponse();

      if (statusCode !== 200) throw new Error(`Expected 200, got ${statusCode}`);
      if (responseData.interviews.length !== 5) {
        throw new Error(`Expected 5 interviews on page 1, got ${responseData.interviews.length}`);
      }
      if (responseData.pagination.total !== 15) {
        throw new Error(`Expected total 15, got ${responseData.pagination.total}`);
      }
      if (responseData.pagination.totalPages !== 3) {
        throw new Error(`Expected totalPages 3, got ${responseData.pagination.totalPages}`);
      }
      if (responseData.pagination.hasNextPage !== true) {
        throw new Error(`Expected hasNextPage true on page 1 of 3`);
      }
      if (responseData.pagination.hasPrevPage !== false) {
        throw new Error(`Expected hasPrevPage false on page 1`);
      }
      console.log("PASS: Page 1 of 3 returned exactly 5 items with correct metadata.");
    }

    // ==========================================
    // TEST 2: Pagination Non-Overlap & Page 2
    // ==========================================
    console.log("\n--- TEST 2: Page 2 & No Item Overlap ---");
    {
      const mock1 = createMockReqRes(userAId, { page: "1", limit: "5" });
      await getMyInterviews(mock1.req, mock1.res, mock1.next);
      const page1Ids = mock1.getResponse().responseData.interviews.map((item) => item._id.toString());

      const mock2 = createMockReqRes(userAId, { page: "2", limit: "5" });
      await getMyInterviews(mock2.req, mock2.res, mock2.next);
      const { responseData } = mock2.getResponse();
      const page2Ids = responseData.interviews.map((item) => item._id.toString());

      if (responseData.interviews.length !== 5) {
        throw new Error(`Expected 5 interviews on page 2, got ${responseData.interviews.length}`);
      }
      if (responseData.pagination.hasNextPage !== true || responseData.pagination.hasPrevPage !== true) {
        throw new Error(`Expected both hasNextPage and hasPrevPage to be true on page 2 of 3`);
      }

      const overlap = page1Ids.filter((id) => page2Ids.includes(id));
      if (overlap.length > 0) {
        throw new Error(`Found overlapping items between page 1 and page 2: ${overlap.join(", ")}`);
      }
      console.log("PASS: Page 2 returned distinct items with zero overlap with Page 1.");
    }

    // ==========================================
    // TEST 3: Stable Ordering (Newest First)
    // ==========================================
    console.log("\n--- TEST 3: Stable Ordering (Newest First) ---");
    {
      const { req, res, next, getResponse } = createMockReqRes(userAId, { page: "1", limit: "15" });
      await getMyInterviews(req, res, next);
      const { responseData } = getResponse();

      for (let i = 0; i < responseData.interviews.length - 1; i++) {
        const current = new Date(responseData.interviews[i].createdAt).getTime();
        const nextDate = new Date(responseData.interviews[i + 1].createdAt).getTime();
        if (current < nextDate) {
          throw new Error(`Sorting error: item ${i} (${current}) is older than item ${i + 1} (${nextDate})`);
        }
      }
      console.log("PASS: All 15 items are correctly ordered newest first (descending createdAt).");
    }

    // ==========================================
    // TEST 4: Projection & Data Sanitization
    // ==========================================
    console.log("\n--- TEST 4: Projection & Lean Payload ---");
    {
      const { req, res, next, getResponse } = createMockReqRes(userAId, { page: "1", limit: "5" });
      await getMyInterviews(req, res, next);
      const { responseData } = getResponse();

      const sample = responseData.interviews[0];
      if (sample.conversation !== undefined) {
        throw new Error("Projection failure: conversation array was leaked in history list!");
      }
      if (sample.resumeText !== undefined) {
        throw new Error("Projection failure: resumeText was leaked in history list!");
      }
      if (sample.interviewPlan !== undefined) {
        throw new Error("Projection failure: interviewPlan was leaked in history list!");
      }
      if (!sample._id || !sample.role || !sample.status || !sample.createdAt) {
        throw new Error("Essential fields missing from projected interview summary!");
      }
      console.log("PASS: Sensitive and heavy fields (conversation, resumeText, interviewPlan) excluded from response.");
    }

    // ==========================================
    // TEST 5: Input Validation & Clamping
    // ==========================================
    console.log("\n--- TEST 5: Input Validation & Limit Clamping ---");
    {
      // limit > MAX_LIMIT (50)
      const mockClamp = createMockReqRes(userAId, { page: "1", limit: "100" });
      await getMyInterviews(mockClamp.req, mockClamp.res, mockClamp.next);
      if (mockClamp.getResponse().responseData.pagination.limit !== 50) {
        throw new Error(`Expected limit clamped to 50, got ${mockClamp.getResponse().responseData.pagination.limit}`);
      }

      // Invalid negative page
      const mockNegativePage = createMockReqRes(userAId, { page: "-10", limit: "10" });
      await getMyInterviews(mockNegativePage.req, mockNegativePage.res, mockNegativePage.next);
      if (mockNegativePage.getResponse().responseData.pagination.page !== 1) {
        throw new Error(`Expected negative page to normalize to 1, got ${mockNegativePage.getResponse().responseData.pagination.page}`);
      }

      // Non-numeric parameters
      const mockNaN = createMockReqRes(userAId, { page: "abc", limit: "xyz" });
      await getMyInterviews(mockNaN.req, mockNaN.res, mockNaN.next);
      const nanRes = mockNaN.getResponse().responseData.pagination;
      if (nanRes.page !== 1 || nanRes.limit !== 10) {
        throw new Error(`Expected NaN fallback to page 1 limit 10, got page=${nanRes.page}, limit=${nanRes.limit}`);
      }
      console.log("PASS: Invalid inputs, NaN and boundary limits (>50) properly sanitized and clamped.");
    }

    // ==========================================
    // TEST 6: User Isolation
    // ==========================================
    console.log("\n--- TEST 6: User Data Isolation ---");
    {
      const { req, res, next, getResponse } = createMockReqRes(userBId, { page: "1", limit: "10" });
      await getMyInterviews(req, res, next);
      const { responseData } = getResponse();

      if (responseData.pagination.total !== 5) {
        throw new Error(`Expected User B total 5, got ${responseData.pagination.total}`);
      }
      if (responseData.interviews.length !== 5) {
        throw new Error(`Expected User B 5 interviews, got ${responseData.interviews.length}`);
      }
      const hasOtherUserData = responseData.interviews.some((item) => item.role.includes("User A"));
      if (hasOtherUserData) {
        throw new Error("Data isolation breach: User B received User A's interviews!");
      }
      console.log("PASS: User B can only see their own 5 interviews; zero data leakage from User A.");
    }

    // ==========================================
    // TEST 7: Career Aggregated Stats
    // ==========================================
    console.log("\n--- TEST 7: Aggregated Career Stats Across All Pages ---");
    {
      // Even when requesting limit=5 (1/3 of User A's data), stats must reflect ALL 15 interviews
      const { req, res, next, getResponse } = createMockReqRes(userAId, { page: "1", limit: "5" });
      await getMyInterviews(req, res, next);
      const { responseData } = getResponse();

      const { stats } = responseData;
      if (!stats) throw new Error("Stats object missing from response!");
      if (stats.totalInterviews !== 15) {
        throw new Error(`Expected stats.totalInterviews=15, got ${stats.totalInterviews}`);
      }
      if (stats.completedInterviews !== 8) {
        throw new Error(`Expected stats.completedInterviews=8, got ${stats.completedInterviews}`);
      }
      if (stats.inProgressInterviews !== 7) {
        throw new Error(`Expected stats.inProgressInterviews=7, got ${stats.inProgressInterviews}`);
      }
      if (typeof stats.averageScore !== "number" || stats.averageScore <= 0) {
        throw new Error(`Expected valid averageScore, got ${stats.averageScore}`);
      }
      console.log(`PASS: Career stats computed accurately across full history (Total: ${stats.totalInterviews}, Completed: ${stats.completedInterviews}, In-Progress: ${stats.inProgressInterviews}, Avg Score: ${stats.averageScore}%).`);
    }

    console.log("\n==========================================");
    console.log("ALL PAGINATION TESTS PASSED SUCCESSFULLY!");
    console.log("==========================================");
  } finally {
    // Cleanup test data
    console.log("\nCleaning up test records...");
    await Interview.deleteMany({ user: { $in: [userAId, userBId] } });
    await User.deleteMany({ _id: { $in: [userAId, userBId] } });
    console.log("Test records cleaned up.");
    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
