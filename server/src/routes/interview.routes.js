const express = require("express");

const {
  createInterview,
  getMyInterviews,
  getInterviewById,
  updateInterview,
  deleteInterview,
  completeInterview,
  getNextQuestion,
  submitAnswer,
} = require("../controllers/interview.controller");

const authMiddleware = require("../middleware/auth.middleware");
const {
  interviewCreateLimiter,
  questionGenerateLimiter,
  answerEvaluationLimiter,
} = require("../middleware/rateLimiter.middleware");

const validate = require("../middleware/validate.middleware");
const {
  interviewIdParamSchema,
  createInterviewSchema,
  updateInterviewSchema,
  getMyInterviewsQuerySchema,
  submitAnswerSchema,
} = require("../validators/interviewRequest.validator");

const router = express.Router();

router.post(
  "/interviews",
  authMiddleware,
  interviewCreateLimiter,
  validate({ body: createInterviewSchema }),
  createInterview
);

router.get(
  "/interviews",
  authMiddleware,
  validate({ query: getMyInterviewsQuerySchema }),
  getMyInterviews
);

router.get(
  "/interviews/:id",
  authMiddleware,
  validate({ params: interviewIdParamSchema }),
  getInterviewById
);

router.patch(
  "/interviews/:id",
  authMiddleware,
  validate({ params: interviewIdParamSchema, body: updateInterviewSchema }),
  updateInterview
);

router.delete(
  "/interviews/:id",
  authMiddleware,
  validate({ params: interviewIdParamSchema }),
  deleteInterview
);

router.patch(
  "/interviews/:id/complete",
  authMiddleware,
  validate({ params: interviewIdParamSchema }),
  completeInterview
);

router.post(
  "/interviews/:id/question",
  authMiddleware,
  questionGenerateLimiter,
  validate({ params: interviewIdParamSchema }),
  getNextQuestion
);

router.post(
  "/interviews/:id/answer",
  authMiddleware,
  answerEvaluationLimiter,
  validate({ params: interviewIdParamSchema, body: submitAnswerSchema }),
  submitAnswer
);

module.exports = router;