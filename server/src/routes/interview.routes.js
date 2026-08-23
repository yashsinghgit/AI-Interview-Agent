const express = require("express");

const {
  createInterview,
  getMyInterviews,
  getInterviewById,
  updateInterview,
  completeInterview,
  getNextQuestion,
  submitAnswer,
} = require("../controllers/interview.controller");

const authMiddleware = require("../middleware/auth.middleware");

const router = express.Router();

router.post(
  "/interviews",
  authMiddleware,
  createInterview
);

router.get(
  "/interviews",
  authMiddleware,
  getMyInterviews,
)

router.get(
  "/interviews/:id",
  authMiddleware,
  getInterviewById
)

router.patch(
  "/interviews/:id",
  authMiddleware,
  updateInterview
);

router.patch(
  "/interviews/:id/complete",
  authMiddleware,
  completeInterview
);

router.post("/interviews/:id/question",
  authMiddleware,
  getNextQuestion,
)

router.post(
  "/interviews/:id/answer",
  authMiddleware,
  submitAnswer
);

module.exports = router;