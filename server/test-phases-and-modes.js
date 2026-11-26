const assert = require("assert");
const { questionSchema } = require("./src/validators/question.validator");
const { answerEvaluationSchema } = require("./src/validators/answer.validator");
const { followUpSchema } = require("./src/validators/followUp.validators");
const { createInterviewSchema } = require("./src/validators/interviewRequest.validator");
const { PHASES, determineNextPhase } = require("./src/services/ai.service");

console.log("Starting backend requirements verification suite...\n");

// 1. Verify Phase sequence & budgets
console.log("Test 1: Phase sequence and order");
assert.deepStrictEqual(PHASES, [
  "warmup",
  "resume",
  "technical",
  "problem_solving",
  "behavioral",
]);

// Test forward progression only
const mockInterviewWarmup = {
  currentPhase: "warmup",
  createdAt: new Date(Date.now() - 3 * 60 * 1000), // 3 min ago (past warmup 2m budget)
  conversation: [{ phase: "warmup" }, { phase: "warmup" }],
};
const nextPhase = determineNextPhase(mockInterviewWarmup, false);
assert.strictEqual(nextPhase, "resume", "Should advance from warmup to resume past 2m budget");

// Test follow-up stays in current phase
const followupPhase = determineNextPhase(mockInterviewWarmup, true);
assert.strictEqual(followupPhase, "warmup", "Follow-up must stay in the current phase");

// Test never backwards
const mockTechnicalInterview = {
  currentPhase: "technical",
  createdAt: new Date(Date.now() - 1 * 60 * 1000), // only 1 min ago
  conversation: [{ phase: "warmup" }, { phase: "resume" }, { phase: "technical" }],
};
const technicalAdvance = determineNextPhase(mockTechnicalInterview, false);
assert.strictEqual(technicalAdvance, "technical", "Phase must never go backwards to warmup/resume");
console.log("✓ Phase sequence and follow-up phase retention passed.\n");

// 2. Question generation schema validation
console.log("Test 2: Question generation JSON schema");
const sampleValidQuestion = {
  phase: "resume",
  question: "Could you elaborate on how you handled indexing in PostgreSQL on your e-commerce project?",
  is_followup: false,
  based_on: "PostgreSQL project on resume",
  transition: "Moving on to your past project experience.",
};
const parsedQ = questionSchema.parse(sampleValidQuestion);
assert.strictEqual(parsedQ.phase, "resume");
assert.strictEqual(parsedQ.is_followup, false);
assert.strictEqual(parsedQ.based_on, "PostgreSQL project on resume");

// Question 1 greeting
const sampleQuestionOne = {
  phase: "warmup",
  question: "Could you introduce yourself and what drew you to this Backend Engineer role?",
  is_followup: false,
  based_on: "Backend Engineer",
  transition: null,
  greeting: "Welcome to your interview; let's get started.",
};
const parsedQ1 = questionSchema.parse(sampleQuestionOne);
assert.strictEqual(parsedQ1.greeting, "Welcome to your interview; let's get started.");
console.log("✓ Question JSON schema and greeting validation passed.\n");

// 3. Evaluation schema validation (2nd person "you", subscores, strengths, improvements)
console.log("Test 3: Answer evaluation JSON schema");
const sampleValidEvaluation = {
  score: 85,
  headline: "You gave a well-structured breakdown of indexing strategies, though you missed query planning.",
  strengths: [
    "You clearly explained B-Tree vs Hash index trade-offs.",
    "You provided a real-world example from your previous project.",
  ],
  improvements: [
    "You should explicitly mention EXPLAIN ANALYZE for query plan inspection.",
    "You should quantify the latency reductions achieved in production.",
  ],
  subscores: {
    structure: 90,
    depth: 80,
    impact: 85,
    relevance: 90,
  },
  stronger_answer: "In my e-commerce project, I analyzed slow queries using EXPLAIN ANALYZE, identified missing composite indexes on (user_id, created_at), and reduced p95 latency from 450ms to 42ms.",
  enough_signal: true,
  reason: "Sufficient depth shown on database indexing concepts.",
};

const parsedEval = answerEvaluationSchema.parse(sampleValidEvaluation);
assert.strictEqual(parsedEval.score, 85);
assert.strictEqual(parsedEval.strengths.length, 2);
assert.strictEqual(parsedEval.improvements.length, 2);
assert.strictEqual(parsedEval.subscores.depth, 80);
assert.strictEqual(parsedEval.enough_signal, true);
console.log("✓ Answer evaluation JSON schema with subscores and 2nd person feedback passed.\n");

// 4. Request Validator: Interview mode validation
console.log("Test 4: Interview creation validator & mode field");
const practiceReq = createInterviewSchema.parse({
  role: "Senior Backend Developer",
  difficulty: "hard",
  jobDescription: "Looking for Node.js / Express backend engineer.",
  mode: "practice",
});
assert.strictEqual(practiceReq.mode, "practice");

const mockReq = createInterviewSchema.parse({
  role: "Senior Backend Developer",
  difficulty: "hard",
  jobDescription: "Looking for Node.js / Express backend engineer.",
  mode: "mock",
});
assert.strictEqual(mockReq.mode, "mock");

const defaultModeReq = createInterviewSchema.parse({
  role: "Senior Backend Developer",
  difficulty: "hard",
  jobDescription: "Looking for Node.js / Express backend engineer.",
});
assert.strictEqual(defaultModeReq.mode, "practice");
console.log("✓ Interview mode validator (practice vs mock) passed.\n");

// 5. Follow-up schema validation
console.log("Test 5: Follow-up decision schema");
const sampleFollowUp = {
  decision: "follow_up",
  phase: "technical",
  question: "How would you handle index bloat on high-write tables?",
  is_followup: true,
  based_on: "PostgreSQL indexing",
  transition: "Following up on your answer,",
};
const parsedFollowUp = followUpSchema.parse(sampleFollowUp);
assert.strictEqual(parsedFollowUp.decision, "follow_up");
assert.strictEqual(parsedFollowUp.phase, "technical");
assert.strictEqual(parsedFollowUp.is_followup, true);
console.log("✓ Follow-up schema validation passed.\n");

console.log("ALL 5 BACKEND VERIFICATION CHECKS PASSED SUCCESSFULLY!");
