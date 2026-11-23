require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const connectDB = require("./src/db/db");
const Interview = require("./src/models/interview.model");
const aiService = require("./src/services/ai.service");
const { getNextQuestion, submitAnswer } = require("./src/controllers/interview.controller");

// Helper to create mock Express req, res, next for getNextQuestion
function createMockGetQuestionHttp(userId, interviewId) {
  return new Promise((resolve) => {
    let resolved = false;

    const req = {
      params: { id: interviewId.toString() },
      user: { userId: userId.toString() },
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        if (!resolved) {
          resolved = true;
          resolve({ status: this.statusCode, body: this.body });
        }
        return this;
      },
    };

    const next = (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ status: 500, error: err });
      }
    };

    getNextQuestion(req, res, next).catch((err) => {
      if (!resolved) {
        resolved = true;
        resolve({ status: 500, error: err });
      }
    });
  });
}

// Helper to create mock Express req, res, next for submitAnswer
function createMockSubmitAnswerHttp(userId, interviewId, answer) {
  return new Promise((resolve) => {
    let resolved = false;

    const req = {
      params: { id: interviewId.toString() },
      user: { userId: userId.toString() },
      body: { answer },
    };

    const res = {
      statusCode: 200,
      body: null,
      status(code) {
        this.statusCode = code;
        return this;
      },
      json(data) {
        this.body = data;
        if (!resolved) {
          resolved = true;
          resolve({ status: this.statusCode, body: this.body });
        }
        return this;
      },
    };

    const next = (err) => {
      if (!resolved) {
        resolved = true;
        resolve({ status: 500, error: err });
      }
    };

    submitAnswer(req, res, next).catch((err) => {
      if (!resolved) {
        resolved = true;
        resolve({ status: 500, error: err });
      }
    });
  });
}

async function runConcurrencyTests() {
  console.log("=================================================");
  console.log("      ATOMIC CONCURRENCY & RACE CONDITION TESTS  ");
  console.log("=================================================");

  const originalGenerateQuestion = aiService.generateQuestion;
  const originalEvaluateAnswer = aiService.evaluateAnswer;
  const originalGenerateFollowUp = aiService.generateFollowUp;
  const originalGenerateFinalReport = aiService.generateFinalReport;

  const testUserId = new mongoose.Types.ObjectId();
  const createdInterviewIds = [];

  try {
    await connectDB();
    console.log("Connected to MongoDB for concurrency verification.\n");

    // -----------------------------------------------------------------
    // TEST 1: Simultaneous getNextQuestion() requests (5 concurrent calls)
    // -----------------------------------------------------------------
    console.log("[TEST 1] Testing 5 simultaneous getNextQuestion() requests...");

    const interview1 = await Interview.create({
      user: testUserId,
      role: "Backend Engineer",
      difficulty: "medium",
      jobDescription: "Node.js and MongoDB backend developer",
      resumeText: "Experienced with microservices and concurrency.",
      interviewPlan: {
        interviewStrategy: {
          primaryFocus: "technical",
          questionRange: { minimum: 15, maximum: 20 },
        },
        technical: { priority: "high", topics: ["Node.js", "MongoDB"], targetDepth: "deep" },
        resumeBased: { priority: "medium", areas: ["Backend"], targetDepth: "moderate" },
        projectBased: { priority: "medium", projects: [] },
        problemSolving: { priority: "medium", areas: ["Concurrency"], difficulty: "medium" },
        behavioral: { priority: "medium", competencies: ["Ownership"], scenarioTypes: ["Technical dispute"] },
      },
      conversation: [],
      currentQuestion: 0,
      status: "in-progress",
    });
    createdInterviewIds.push(interview1._id);

    let aiGenCallCount = 0;
    aiService.generateQuestion = async (doc) => {
      aiGenCallCount++;
      await new Promise((r) => setTimeout(r, 200));
      return {
        question: "Explain race conditions and how to prevent them in Node.js.",
        category: "technical",
        topic: "Concurrency",
        reason: "Testing concurrency handling.",
      };
    };

    const requests1 = [
      createMockGetQuestionHttp(testUserId, interview1._id),
      createMockGetQuestionHttp(testUserId, interview1._id),
      createMockGetQuestionHttp(testUserId, interview1._id),
      createMockGetQuestionHttp(testUserId, interview1._id),
      createMockGetQuestionHttp(testUserId, interview1._id),
    ];

    const results1 = await Promise.all(requests1);
    const successful1 = results1.filter((r) => r.status === 200);
    const conflicts1 = results1.filter((r) => r.status === 409);

    console.log(`-> Results: ${successful1.length} succeeded (200), ${conflicts1.length} rejected with Conflict (409)`);
    console.log(`-> AI Service invocations: ${aiGenCallCount}`);

    if (successful1.length !== 1 || conflicts1.length !== 4 || aiGenCallCount !== 1) {
      throw new Error(`Test 1 assertion failed: expected 1 success, 4 conflicts, 1 AI call`);
    }

    const savedDoc1 = await Interview.findById(interview1._id);
    if (savedDoc1.conversation.length !== 1 || savedDoc1.currentQuestion !== 1) {
      throw new Error("Test 1 assertion failed: incorrect question count in DB");
    }
    console.log("PASS: Concurrency test for getNextQuestion() passed.\n");

    // -----------------------------------------------------------------
    // TEST 2: Lock release when getNextQuestion AI fails
    // -----------------------------------------------------------------
    console.log("[TEST 2] Testing lock release when getNextQuestion AI fails...");

    const interview2 = await Interview.create({
      user: testUserId,
      role: "Backend Engineer",
      difficulty: "medium",
      jobDescription: "Testing error release",
      interviewPlan: {
        interviewStrategy: { questionRange: { minimum: 15, maximum: 20 } },
      },
      conversation: [],
      currentQuestion: 0,
      status: "in-progress",
    });
    createdInterviewIds.push(interview2._id);

    aiService.generateQuestion = async () => {
      await new Promise((r) => setTimeout(r, 50));
      throw new Error("Simulated Gemini AI API outage");
    };

    const failResult = await createMockGetQuestionHttp(testUserId, interview2._id);
    console.log(`-> Failed request status: ${failResult.status}`);

    const docAfterFailure = await Interview.findById(interview2._id);
    if (docAfterFailure.questionLock?.token !== null || docAfterFailure.questionLock?.expiresAt !== null) {
      throw new Error("Lock was not properly released after AI service error");
    }

    aiService.generateQuestion = async () => ({
      question: "What is event-driven architecture?",
      category: "technical",
      topic: "Architecture",
      reason: "Retry after failure",
    });

    const retryResult = await createMockGetQuestionHttp(testUserId, interview2._id);
    if (retryResult.status !== 200) {
      throw new Error(`Expected retry to succeed with 200, got ${retryResult.status}`);
    }
    console.log("PASS: Lock release test for getNextQuestion() passed.\n");

    // -----------------------------------------------------------------
    // TEST 3: Simultaneous submitAnswer() submissions (5 concurrent calls)
    // -----------------------------------------------------------------
    console.log("[TEST 3] Testing 5 simultaneous submitAnswer() requests on the same question...");

    const interview3 = await Interview.create({
      user: testUserId,
      role: "Backend Engineer",
      difficulty: "medium",
      jobDescription: "Node.js and MongoDB backend developer",
      interviewPlan: {
        interviewStrategy: {
          primaryFocus: "technical",
          questionRange: { minimum: 15, maximum: 20 },
        },
      },
      conversation: [
        {
          question: "Explain the difference between process.nextTick and setImmediate.",
          category: "technical",
          topic: "Node.js Event Loop",
          reason: "Assessing event loop phases.",
          answer: "",
          status: "unanswered",
        },
      ],
      currentQuestion: 1,
      followUpCount: 0,
      status: "in-progress",
    });
    createdInterviewIds.push(interview3._id);

    let evalCallCount = 0;
    aiService.evaluateAnswer = async () => {
      evalCallCount++;
      await new Promise((r) => setTimeout(r, 200));
      return {
        score: 85,
        evaluation: "Great explanation of microtask queue vs check phase.",
        strengths: ["Clear understanding of microtasks"],
        weaknesses: ["Could mention I/O starvation"],
      };
    };

    aiService.generateFollowUp = async () => {
      return {
        decision: "follow_up",
        question: "Can process.nextTick starve the I/O event loop if called recursively?",
        category: "technical",
        topic: "Event Loop Starvation",
        reason: "Probing boundary conditions.",
      };
    };

    const answerRequests = [
      createMockSubmitAnswerHttp(testUserId, interview3._id, "nextTick runs before I/O, setImmediate runs in check phase."),
      createMockSubmitAnswerHttp(testUserId, interview3._id, "nextTick runs before I/O, setImmediate runs in check phase."),
      createMockSubmitAnswerHttp(testUserId, interview3._id, "nextTick runs before I/O, setImmediate runs in check phase."),
      createMockSubmitAnswerHttp(testUserId, interview3._id, "nextTick runs before I/O, setImmediate runs in check phase."),
      createMockSubmitAnswerHttp(testUserId, interview3._id, "nextTick runs before I/O, setImmediate runs in check phase."),
    ];

    const answerResults = await Promise.all(answerRequests);
    const successfulAnswers = answerResults.filter((r) => r.status === 200);
    const conflictAnswers = answerResults.filter((r) => r.status === 409);

    console.log(`-> Results: ${successfulAnswers.length} succeeded (200), ${conflictAnswers.length} rejected with Conflict (409)`);
    console.log(`-> AI Evaluation invocations: ${evalCallCount}`);

    if (successfulAnswers.length !== 1) {
      throw new Error(`Expected exactly 1 success, got ${successfulAnswers.length}`);
    }
    if (conflictAnswers.length !== 4) {
      throw new Error(`Expected exactly 4 conflicts, got ${conflictAnswers.length}`);
    }
    if (evalCallCount !== 1) {
      throw new Error(`Expected AI evaluation to be called exactly once, got ${evalCallCount}`);
    }

    const savedDoc3 = await Interview.findById(interview3._id);
    console.log(`-> Database state: conversation.length = ${savedDoc3.conversation.length}, currentQuestion = ${savedDoc3.currentQuestion}`);
    console.log(`-> Question 0: status = ${savedDoc3.conversation[0].status}, score = ${savedDoc3.conversation[0].score}`);
    console.log(`-> Question 1: status = ${savedDoc3.conversation[1].status}, question = ${savedDoc3.conversation[1].question}`);
    console.log(`-> answerLock: token = ${savedDoc3.answerLock?.token}, expiresAt = ${savedDoc3.answerLock?.expiresAt}`);

    if (savedDoc3.conversation.length !== 2) {
      throw new Error(`Expected conversation.length = 2 (original answered + 1 follow-up), found ${savedDoc3.conversation.length}`);
    }
    if (savedDoc3.conversation[0].status !== "answered" || !savedDoc3.conversation[0].answer) {
      throw new Error("Expected question 0 to be marked as answered with non-empty answer");
    }
    if (savedDoc3.conversation[1].status !== "unanswered") {
      throw new Error("Expected newly generated follow-up question to have status 'unanswered'");
    }
    if (savedDoc3.currentQuestion !== 2) {
      throw new Error(`Expected currentQuestion to be 2, found ${savedDoc3.currentQuestion}`);
    }
    if (savedDoc3.answerLock?.token !== null || savedDoc3.answerLock?.expiresAt !== null) {
      throw new Error("Expected answerLock to be cleared after completion");
    }

    console.log("PASS: Simultaneous submitAnswer() concurrency test passed: exactly 1 evaluated, duplicates prevented, lock cleared.\n");

    // -----------------------------------------------------------------
    // TEST 4: Repeated submission for an already-answered question
    // -----------------------------------------------------------------
    console.log("[TEST 4] Testing repeated submission for an already-answered question...");

    const repeatResult = await createMockSubmitAnswerHttp(
      testUserId,
      interview3._id,
      "Another answer attempt for question 0"
    );

    // Note: interview3 now has Question 1 (unanswered). If a request tries to answer, it would answer Question 1.
    // To specifically test re-submitting an already-answered question when no unanswered question exists:
    const interview4 = await Interview.create({
      user: testUserId,
      role: "Backend Engineer",
      difficulty: "medium",
      jobDescription: "Testing repeated submissions",
      interviewPlan: {
        interviewStrategy: { questionRange: { minimum: 15, maximum: 20 } },
      },
      conversation: [
        {
          question: "What is MongoDB replication?",
          category: "technical",
          topic: "MongoDB",
          answer: "Replica sets maintain multiple copies of data.",
          score: 90,
          status: "answered",
        },
      ],
      currentQuestion: 1,
      status: "in-progress",
    });
    createdInterviewIds.push(interview4._id);

    const alreadyAnsweredResult = await createMockSubmitAnswerHttp(
      testUserId,
      interview4._id,
      "Duplicate submission for already answered question"
    );

    console.log(`-> Repeated submission status: ${alreadyAnsweredResult.status}, body:`, alreadyAnsweredResult.body);
    if (alreadyAnsweredResult.status !== 409) {
      throw new Error(`Expected already-answered question submission to return 409, got ${alreadyAnsweredResult.status}`);
    }

    console.log("PASS: Repeated submission rejection passed.\n");

    // -----------------------------------------------------------------
    // TEST 5: Lock release and state rollback when AI evaluation fails
    // -----------------------------------------------------------------
    console.log("[TEST 5] Testing lock release and rollback when AI evaluation fails...");

    const interview5 = await Interview.create({
      user: testUserId,
      role: "Backend Engineer",
      difficulty: "medium",
      jobDescription: "Testing evaluation failure",
      interviewPlan: {
        interviewStrategy: { questionRange: { minimum: 15, maximum: 20 } },
      },
      conversation: [
        {
          question: "Explain indexing in MongoDB.",
          category: "technical",
          topic: "Indexing",
          answer: "",
          status: "unanswered",
        },
      ],
      currentQuestion: 1,
      status: "in-progress",
    });
    createdInterviewIds.push(interview5._id);

    aiService.evaluateAnswer = async () => {
      await new Promise((r) => setTimeout(r, 50));
      throw new Error("Simulated Gemini AI evaluation outage");
    };

    const failAnswerResult = await createMockSubmitAnswerHttp(
      testUserId,
      interview5._id,
      "Indexes use B-trees to speed up query execution."
    );

    console.log(`-> Failed submission status: ${failAnswerResult.status}`);

    const docAfterEvalFailure = await Interview.findById(interview5._id);
    console.log(`-> Question status after failure: ${docAfterEvalFailure.conversation[0].status}`);
    console.log(`-> Lock state after failure: token = ${docAfterEvalFailure.answerLock?.token}`);

    if (docAfterEvalFailure.conversation[0].status !== "unanswered") {
      throw new Error("Question status was not rolled back to 'unanswered' after evaluation failure");
    }
    if (docAfterEvalFailure.answerLock?.token !== null || docAfterEvalFailure.answerLock?.expiresAt !== null) {
      throw new Error("answerLock was not properly released after evaluation failure");
    }

    // Immediate retry should succeed
    aiService.evaluateAnswer = async () => ({
      score: 88,
      evaluation: "Accurate description of B-tree indexes.",
      strengths: ["Clear terminology"],
      weaknesses: [],
    });
    aiService.generateFollowUp = async () => ({
      decision: "new_topic",
    });
    aiService.generateQuestion = async () => ({
      question: "What is database sharding?",
      category: "technical",
      topic: "Scaling",
      reason: "Next topic after indexing.",
    });

    const retryAnswerResult = await createMockSubmitAnswerHttp(
      testUserId,
      interview5._id,
      "Indexes use B-trees to speed up query execution."
    );

    console.log(`-> Retry submission status: ${retryAnswerResult.status}`);
    if (retryAnswerResult.status !== 200) {
      throw new Error(`Expected retry to succeed with 200, got ${retryAnswerResult.status}`);
    }

    console.log("PASS: Lock release and rollback test passed: user was not blocked, retry succeeded.\n");

    // -----------------------------------------------------------------
    // TEST 6: Conflicting final-report generation prevention
    // -----------------------------------------------------------------
    console.log("[TEST 6] Testing conflicting final-report generation prevention...");

    const interview6 = await Interview.create({
      user: testUserId,
      role: "Backend Engineer",
      difficulty: "medium",
      jobDescription: "Testing final report completion",
      interviewPlan: {
        interviewStrategy: { questionRange: { minimum: 15, maximum: 20 } },
      },
      conversation: [
        {
          question: "Question 20: Final question of the interview.",
          category: "behavioral",
          topic: "Leadership",
          answer: "",
          status: "unanswered",
        },
      ],
      currentQuestion: 20, // At maximum questions limit!
      status: "in-progress",
    });
    createdInterviewIds.push(interview6._id);

    let reportGenCount = 0;
    aiService.generateFinalReport = async () => {
      reportGenCount++;
      await new Promise((r) => setTimeout(r, 200));
      return {
        overallScore: 88,
        strengths: ["Strong backend concepts"],
        weaknesses: ["Deep-dive system design"],
        recommendations: ["Study distributed transactions"],
      };
    };

    const finalReportRequests = [
      createMockSubmitAnswerHttp(testUserId, interview6._id, "My leadership answer."),
      createMockSubmitAnswerHttp(testUserId, interview6._id, "My leadership answer."),
      createMockSubmitAnswerHttp(testUserId, interview6._id, "My leadership answer."),
    ];

    const finalReportResults = await Promise.all(finalReportRequests);
    const successReports = finalReportResults.filter((r) => r.status === 200);
    const conflictReports = finalReportResults.filter((r) => r.status === 409);

    console.log(`-> Results: ${successReports.length} succeeded (200), ${conflictReports.length} rejected (409)`);
    console.log(`-> Final Report invocations: ${reportGenCount}`);

    if (successReports.length !== 1 || conflictReports.length !== 2 || reportGenCount !== 1) {
      throw new Error("Test 6 assertion failed: expected exactly 1 final report generation");
    }

    const docAfterCompletion = await Interview.findById(interview6._id);
    if (docAfterCompletion.status !== "completed" || !docAfterCompletion.finalReport?.overallScore) {
      throw new Error("Expected interview status to be 'completed' with finalReport populated");
    }

    console.log("PASS: Conflicting final-report generation prevented: exactly 1 report created, interview completed cleanly.\n");

    console.log("=================================================");
    console.log("   ALL CONCURRENCY & RACE CONDITION TESTS PASSED ");
    console.log("=================================================");
  } finally {
    // Restore original functions
    aiService.generateQuestion = originalGenerateQuestion;
    aiService.evaluateAnswer = originalEvaluateAnswer;
    aiService.generateFollowUp = originalGenerateFollowUp;
    aiService.generateFinalReport = originalGenerateFinalReport;

    // Clean up created test documents
    if (createdInterviewIds.length > 0) {
      await Interview.deleteMany({ _id: { $in: createdInterviewIds } });
      console.log(`Cleaned up ${createdInterviewIds.length} test interview documents from MongoDB.`);
    }

    await mongoose.disconnect();
    console.log("Disconnected from MongoDB.");
  }
}

runConcurrencyTests().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
