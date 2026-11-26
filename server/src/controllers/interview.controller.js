const crypto = require("crypto");
const mongoose = require("mongoose");
const Interview = require("../models/interview.model");

const aiService = require("../services/ai.service");
const {
  generateInterviewPlan,
  evaluateAnswer,
  generateFollowUp,
  generateFinalReport,
} = aiService;

// ==========================================
// CREATE INTERVIEW
// ==========================================

const createInterview = async (req, res, next) => {
  try {
    const { role, difficulty, jobDescription, resumeText, mode = "practice" } = req.body;
    const userId = req.user.userId;

    const interviewPlan = await generateInterviewPlan({
      role,
      difficulty,
      jobDescription,
      resumeText: resumeText || "",
    });

    const durationMinutes = 20;
    const expiresAt = new Date(Date.now() + durationMinutes * 60 * 1000);

    const interview = await Interview.create({
      user: userId,
      title: role.trim(),
      mode: mode === "mock" ? "mock" : "practice",
      currentPhase: "warmup",
      role,
      difficulty,
      jobDescription,
      resumeText: resumeText || "",
      interviewPlan,
      durationMinutes,
      expiresAt,
    });

    return res.status(201).json({
      message: "Interview created successfully",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET ALL MY INTERVIEWS (PAGINATED)
// ==========================================

const getMyInterviews = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    let page = parseInt(req.query.page, 10);
    let limit = parseInt(req.query.limit, 10);

    if (isNaN(page) || page < 1) {
      page = 1;
    }

    const MAX_LIMIT = 50;
    const DEFAULT_LIMIT = 10;
    if (isNaN(limit) || limit < 1) {
      limit = DEFAULT_LIMIT;
    } else if (limit > MAX_LIMIT) {
      limit = MAX_LIMIT;
    }

    const skip = (page - 1) * limit;

    const [interviews, totalInterviews, completedCount, inProgressCount, scoreAgg] =
      await Promise.all([
        Interview.find({ user: userId })
          .sort({ createdAt: -1, _id: -1 })
          .skip(skip)
          .limit(limit)
          .select(
            "_id role difficulty status currentQuestion createdAt updatedAt finalReport.overallScore"
          )
          .lean(),
        Interview.countDocuments({ user: userId }),
        Interview.countDocuments({ user: userId, status: "completed" }),
        Interview.countDocuments({ user: userId, status: "in-progress" }),
        Interview.aggregate([
          {
            $match: {
              user: new mongoose.Types.ObjectId(userId),
              status: "completed",
              "finalReport.overallScore": { $ne: null },
            },
          },
          {
            $group: {
              _id: null,
              avgScore: { $avg: "$finalReport.overallScore" },
            },
          },
        ]),
      ]);

    const totalPages = Math.ceil(totalInterviews / limit) || 1;
    const hasNextPage = page < totalPages;
    const hasPrevPage = page > 1;

    const averageScore =
      scoreAgg.length > 0 && scoreAgg[0].avgScore != null
        ? Math.round(scoreAgg[0].avgScore)
        : 0;

    return res.status(200).json({
      message: "Interviews retrieved successfully",
      interviews,
      pagination: {
        total: totalInterviews,
        page,
        limit,
        totalPages,
        hasNextPage,
        hasPrevPage,
      },
      stats: {
        totalInterviews,
        completedInterviews: completedCount,
        inProgressInterviews: inProgressCount,
        averageScore,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GET SINGLE INTERVIEW
// ==========================================

const getInterviewById = async (req, res, next) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.userId;

    const interview = await Interview.findById(interviewId);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.user.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to access this interview",
      });
    }

    const interviewObj = interview.toObject();
    const now = new Date();
    const effectiveExpiresAt =
      interview.expiresAt ||
      new Date(interview.createdAt.getTime() + 30 * 60 * 1000);
    interviewObj.expiresAt = effectiveExpiresAt;
    interviewObj.remainingSeconds = Math.max(
      0,
      Math.floor(
        (new Date(effectiveExpiresAt).getTime() - now.getTime()) / 1000
      )
    );

    return res.status(200).json({
      message: "Interview retrieved successfully",
      interview: interviewObj,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// UPDATE INTERVIEW
// ==========================================

const updateInterview = async (req, res, next) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.userId;

    const { role, difficulty, jobDescription, resumeText } = req.body;

    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (role !== undefined) {
      interview.role = role;
    }

    if (difficulty !== undefined) {
      interview.difficulty = difficulty;
    }

    if (jobDescription !== undefined) {
      interview.jobDescription = jobDescription;
    }

    if (resumeText !== undefined) {
      if (typeof resumeText === "string" && resumeText.length > 50000) {
        return res.status(400).json({
          message: "Resume text exceeds the maximum allowed length of 50000 characters.",
        });
      }
      interview.resumeText = resumeText;
    }

    await interview.save();

    return res.status(200).json({
      message: "Interview updated successfully",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// DELETE INTERVIEW (Data Retention & Erasure)
// ==========================================

const deleteInterview = async (req, res, next) => {
  try {
    const { id } = req.params;
    const userId = req.user.userId;

    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.user.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to delete this interview",
      });
    }

    await Interview.findByIdAndDelete(id);

    return res.status(200).json({
      message: "Interview and associated data deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// GENERATE NEXT QUESTION
// ==========================================

const getNextQuestion = async (req, res, next) => {
  const { id } = req.params;
  const userId = req.user.userId;
  let lockAcquiredToken = null;

  try {
    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.user.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to access this interview",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        message: "This interview has already been completed",
      });
    }

    const now = new Date();
    const effectiveExpiresAt =
      interview.expiresAt ||
      new Date(interview.createdAt.getTime() + 30 * 60 * 1000);
    if (now > new Date(effectiveExpiresAt)) {
      return res.status(410).json({
        message: "Interview session has expired. Time limit exceeded.",
        isExpired: true,
      });
    }

    const maximumQuestions =
      interview.interviewPlan?.interviewStrategy?.questionRange?.maximum;

    if (maximumQuestions && interview.currentQuestion >= maximumQuestions) {
      return res.status(400).json({
        message: `Maximum limit of ${maximumQuestions} questions reached. Please complete the interview.`,
      });
    }

    const lastQuestion =
      interview.conversation[interview.conversation.length - 1];

    if (lastQuestion && !lastQuestion.answer) {
      return res.status(400).json({
        message:
          "Please answer the current question before requesting a new one",
      });
    }

    // ------------------------------------------
    // Atomic Lock Acquisition (Compare-and-Swap lease)
    // ------------------------------------------
    const lockToken = crypto.randomUUID();
    const LOCK_TTL_MS = 30000;
    const lockExpiresAt = new Date(now.getTime() + LOCK_TTL_MS);

    const lockedInterview = await Interview.findOneAndUpdate(
      {
        _id: id,
        user: userId,
        status: "in-progress",
        currentQuestion: interview.currentQuestion,
        $or: [
          { "questionLock.token": null },
          { "questionLock.expiresAt": null },
          { "questionLock.expiresAt": { $lt: now } },
        ],
      },
      {
        $set: {
          "questionLock.token": lockToken,
          "questionLock.expiresAt": lockExpiresAt,
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!lockedInterview) {
      const currentDoc = await Interview.findById(id);
      if (
        currentDoc &&
        currentDoc.questionLock?.expiresAt &&
        new Date(currentDoc.questionLock.expiresAt) > now
      ) {
        return res.status(409).json({
          message:
            "A question is currently being generated for this interview. Please wait.",
        });
      }

      return res.status(409).json({
        message:
          "Interview state changed or another question request is in progress. Please refresh and try again.",
      });
    }

    lockAcquiredToken = lockToken;

    // ------------------------------------------
    // Generate question outside of DB lock
    // ------------------------------------------
    const generatedQuestion = await aiService.generateQuestion(lockedInterview);

    // ------------------------------------------
    // Atomic Commit (Compare-and-Swap)
    // Only commit if this request still holds the valid, unexpired lock
    // ------------------------------------------
    const commitTime = new Date();
    const updateFields = {
      $push: {
        conversation: {
          phase: generatedQuestion.phase,
          question: generatedQuestion.question,
          is_followup: generatedQuestion.is_followup || false,
          based_on: generatedQuestion.based_on || "",
          transition: generatedQuestion.transition || null,
          category: generatedQuestion.category,
          topic: generatedQuestion.topic,
          reason: generatedQuestion.reason,
        },
      },
      $inc: { currentQuestion: 1 },
      $set: {
        currentPhase: generatedQuestion.phase,
        "questionLock.token": null,
        "questionLock.expiresAt": null,
      },
    };

    if (generatedQuestion.greeting && !lockedInterview.greeting) {
      updateFields.$set.greeting = generatedQuestion.greeting;
    }

    const updatedInterview = await Interview.findOneAndUpdate(
      {
        _id: id,
        "questionLock.token": lockToken,
        "questionLock.expiresAt": { $gt: commitTime },
      },
      updateFields,
      {
        returnDocument: "after",
      }
    );

    if (!updatedInterview) {
      lockAcquiredToken = null;
      return res.status(409).json({
        message:
          "Question generation timed out or was superseded by another request. Please try again.",
      });
    }

    lockAcquiredToken = null;

    return res.status(200).json({
      message: "Question generated successfully",
      greeting: updatedInterview.greeting || null,
      question: {
        number: updatedInterview.currentQuestion,
        ...generatedQuestion,
      },
    });
  } catch (error) {
    if (lockAcquiredToken) {
      try {
        await Interview.updateOne(
          { _id: id, "questionLock.token": lockAcquiredToken },
          {
            $set: {
              "questionLock.token": null,
              "questionLock.expiresAt": null,
            },
          }
        );
      } catch (releaseErr) {
        console.error("Failed to release question generation lock:", releaseErr);
      }
    }
    next(error);
  }
};

// ==========================================
// SUBMIT ANSWER
// ==========================================

const submitAnswer = async (req, res, next) => {
  const { id } = req.params;
  const { answer } = req.body;
  const userId = req.user.userId;
  let lockAcquiredToken = null;
  let targetQuestionId = null;

  try {
    // ------------------------------------------
    // 1. Answer is validated by Zod
    // ------------------------------------------
    const trimmedAnswer = answer.trim();

    // ------------------------------------------
    // 2. Find interview
    // ------------------------------------------
    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    // ------------------------------------------
    // Check ownership
    // ------------------------------------------
    if (interview.user.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to access this interview",
      });
    }

    // ------------------------------------------
    // Check interview status
    // ------------------------------------------
    if (interview.status === "completed") {
      return res.status(400).json({
        message: "This interview has already been completed",
      });
    }

    const now = new Date();
    const effectiveExpiresAt =
      interview.expiresAt ||
      new Date(interview.createdAt.getTime() + 30 * 60 * 1000);
    if (now > new Date(effectiveExpiresAt)) {
      return res.status(410).json({
        message: "Interview session has expired. Time limit exceeded.",
        isExpired: true,
      });
    }

    // ------------------------------------------
    // 3. Find current question & check state
    // ------------------------------------------
    const conversation = interview.conversation;
    const currentQuestionIndex = conversation.length - 1;
    const currentQuestion = conversation[currentQuestionIndex];

    if (!currentQuestion) {
      return res.status(400).json({
        message: "No unanswered question found",
      });
    }

    // Repeated submission check: if already answered and evaluated
    if (
      currentQuestion.status === "answered" ||
      (currentQuestion.answer && currentQuestion.answer.trim())
    ) {
      return res.status(409).json({
        message: "This question has already been answered and evaluated.",
      });
    }

    // Check if another request is currently evaluating this answer
    const activeLock =
      interview.answerLock?.expiresAt &&
      new Date(interview.answerLock.expiresAt) > now;

    if (currentQuestion.status === "evaluating" || activeLock) {
      return res.status(409).json({
        message: "This answer is currently being evaluated. Please wait.",
      });
    }

    // ------------------------------------------
    // 4. Claim processing atomically (Compare-and-Swap lease)
    // ------------------------------------------
    const lockToken = crypto.randomUUID();
    const LOCK_TTL_MS = 60000; // 60s lease for evaluation + next question generation
    const lockExpiresAt = new Date(now.getTime() + LOCK_TTL_MS);

    const claimedInterview = await Interview.findOneAndUpdate(
      {
        _id: id,
        user: userId,
        status: "in-progress",
        currentQuestion: interview.currentQuestion,
        "conversation._id": currentQuestion._id,
        $and: [
          {
            $or: [
              { "conversation.status": "unanswered" },
              { "conversation.status": null },
              { "conversation.status": { $exists: false } },
            ],
          },
          {
            $or: [
              { "answerLock.token": null },
              { "answerLock.expiresAt": null },
              { "answerLock.expiresAt": { $lt: now } },
            ],
          },
        ],
      },
      {
        $set: {
          "answerLock.token": lockToken,
          "answerLock.questionId": currentQuestion._id,
          "answerLock.expiresAt": lockExpiresAt,
          "conversation.$.status": "evaluating",
        },
      },
      {
        returnDocument: "after",
      }
    );

    if (!claimedInterview) {
      const refreshedDoc = await Interview.findById(id);
      const latestQ =
        refreshedDoc?.conversation?.[refreshedDoc.conversation.length - 1];

      if (
        latestQ?.status === "answered" ||
        (latestQ?.answer && latestQ.answer.trim())
      ) {
        return res.status(409).json({
          message: "This question has already been answered and evaluated.",
        });
      }

      if (
        refreshedDoc?.answerLock?.expiresAt &&
        new Date(refreshedDoc.answerLock.expiresAt) > now
      ) {
        return res.status(409).json({
          message: "This answer is currently being evaluated. Please wait.",
        });
      }

      return res.status(409).json({
        message: "Interview state changed. Please refresh and try again.",
      });
    }

    lockAcquiredToken = lockToken;
    targetQuestionId = currentQuestion._id;

    // ------------------------------------------
    // 5. Evaluate answer outside DB lock
    // ------------------------------------------
    const evaluation = await aiService.evaluateAnswer(
      claimedInterview,
      currentQuestion.question,
      trimmedAnswer,
    );

    // ------------------------------------------
    // 6. Adaptive decision & report generation outside DB lock
    // ------------------------------------------
    const minimumQuestions = 5;
    const maximumQuestions = 15;

    // Build updated conversation array in memory
    const updatedConversation = claimedInterview.conversation.map(
      (item, idx) => {
        if (idx === currentQuestionIndex) {
          return {
            _id: item._id,
            phase: item.phase || claimedInterview.currentPhase || "warmup",
            question: item.question,
            answer: trimmedAnswer,
            score: evaluation.score,
            headline: evaluation.headline,
            evaluation: evaluation.evaluation,
            strengths: evaluation.strengths,
            improvements: evaluation.improvements,
            weaknesses: evaluation.weaknesses,
            subscores: evaluation.subscores,
            stronger_answer: evaluation.stronger_answer,
            enough_signal: evaluation.enough_signal,
            is_followup: item.is_followup || false,
            based_on: item.based_on || "",
            transition: item.transition || null,
            category: item.category,
            topic: item.topic,
            reason: evaluation.reason || item.reason,
            status: "answered",
          };
        }
        return item.toObject ? item.toObject() : item;
      },
    );

    let newCurrentQuestion = claimedInterview.currentQuestion;
    let newFollowUpCount = claimedInterview.followUpCount;
    let newTopic = claimedInterview.currentTopic;
    let newPhase = claimedInterview.currentPhase || "warmup";
    let isCompleted = false;
    let finalReport = null;
    let nextQuestionData = null;
    let responseType = "next"; // "completed_max" | "completed_adaptive" | "follow_up" | "new_topic"

    // Case A: Hard maximum question limit reached (15 questions)
    if (claimedInterview.currentQuestion >= maximumQuestions) {
      finalReport = await aiService.generateFinalReport(claimedInterview);
      isCompleted = true;
      responseType = "completed_max";
    } else {
      // Case B: Adaptive follow-up engine
      let followUp;
      try {
        followUp = await aiService.generateFollowUp(
          claimedInterview,
          currentQuestion.question,
          trimmedAnswer,
          evaluation,
        );
      } catch (followUpErr) {
        console.error(
          "Follow-up generation failed. Falling back to a new question:",
          followUpErr,
        );
        followUp = { decision: "new_topic" };
      }

      if (
        followUp.decision === "complete" &&
        claimedInterview.currentQuestion >= minimumQuestions
      ) {
        finalReport = await aiService.generateFinalReport(claimedInterview);
        isCompleted = true;
        responseType = "completed_adaptive";
      } else if (
        followUp.decision === "follow_up" &&
        claimedInterview.followUpCount < 2
      ) {
        // Follow-ups stay inside the current phase
        newFollowUpCount += 1;
        newCurrentQuestion += 1;
        newTopic = followUp.topic || followUp.based_on;
        newPhase = claimedInterview.currentPhase || "warmup";
        followUp.phase = newPhase;
        followUp.is_followup = true;
        nextQuestionData = followUp;
        responseType = "follow_up";

        updatedConversation.push({
          phase: newPhase,
          question: followUp.question,
          is_followup: true,
          based_on: followUp.based_on || "",
          transition: followUp.transition || null,
          category: followUp.category,
          topic: followUp.topic,
          reason: followUp.reason,
          status: "unanswered",
        });
      } else {
        // Case C: New topic / next phase in sequence (warmup -> resume -> technical -> problem_solving -> behavioral)
        newPhase = aiService.determineNextPhase(claimedInterview, false);
        const nextQ = await aiService.generateQuestion(claimedInterview, newPhase);
        newFollowUpCount = 0;
        newCurrentQuestion += 1;
        newTopic = nextQ.topic || nextQ.based_on;
        nextQuestionData = nextQ;
        responseType = "new_topic";

        updatedConversation.push({
          phase: nextQ.phase || newPhase,
          question: nextQ.question,
          is_followup: false,
          based_on: nextQ.based_on || "",
          transition: nextQ.transition || null,
          category: nextQ.category,
          topic: nextQ.topic,
          reason: nextQ.reason,
          status: "unanswered",
        });
      }
    }

    // ------------------------------------------
    // 7. Atomic Commit using Compare-and-Swap
    // ------------------------------------------
    const commitTime = new Date();
    const updateDoc = {
      conversation: updatedConversation,
      currentQuestion: newCurrentQuestion,
      followUpCount: newFollowUpCount,
      currentTopic: newTopic,
      currentPhase: newPhase,
      "answerLock.token": null,
      "answerLock.questionId": null,
      "answerLock.expiresAt": null,
    };

    if (isCompleted) {
      updateDoc.finalReport = finalReport;
      updateDoc.status = "completed";
    }

    const committedInterview = await Interview.findOneAndUpdate(
      {
        _id: id,
        "answerLock.token": lockToken,
        "answerLock.expiresAt": { $gt: commitTime },
      },
      {
        $set: updateDoc,
      },
      {
        returnDocument: "after",
      },
    );

    if (!committedInterview) {
      lockAcquiredToken = null;
      return res.status(409).json({
        message:
          "Answer evaluation timed out or was superseded by another request. Please try again.",
      });
    }

    lockAcquiredToken = null;

    // ------------------------------------------
    // 8. Send response
    // ------------------------------------------
    const isMockMode = committedInterview.mode === "mock";

    if (isCompleted) {
      const message =
        responseType === "completed_max"
          ? "Answer evaluated and interview completed successfully"
          : "Interview completed successfully";

      return res.status(200).json({
        message,
        evaluation,
        finalReport,
      });
    }

    // In mock mode, withhold evaluation details until final report at the end
    const responseEvaluation = isMockMode ? null : evaluation;

    if (responseType === "follow_up") {
      return res.status(200).json({
        message: isMockMode
          ? "Answer recorded successfully"
          : "Answer evaluated and adaptive follow-up generated successfully",
        mode: committedInterview.mode,
        ...(responseEvaluation ? { evaluation: responseEvaluation } : {}),
        question: {
          number: committedInterview.currentQuestion,
          ...nextQuestionData,
        },
      });
    }

    return res.status(200).json({
      message: isMockMode
        ? "Answer recorded successfully"
        : "Answer evaluated and next question generated successfully",
      mode: committedInterview.mode,
      ...(responseEvaluation ? { evaluation: responseEvaluation } : {}),
      question: {
        number: committedInterview.currentQuestion,
        ...nextQuestionData,
      },
    });
  } catch (error) {
    // ------------------------------------------
    // 9. Safe lock release and state rollback on error
    // ------------------------------------------
    if (lockAcquiredToken) {
      try {
        await Interview.updateOne(
          {
            _id: id,
            "answerLock.token": lockAcquiredToken,
            "conversation._id": targetQuestionId,
          },
          {
            $set: {
              "answerLock.token": null,
              "answerLock.questionId": null,
              "answerLock.expiresAt": null,
              "conversation.$.status": "unanswered",
            },
          },
        );
      } catch (releaseErr) {
        console.error("Failed to release answer lock on error:", releaseErr);
      }
    }
    next(error);
  }
};

// ==========================================
// COMPLETE INTERVIEW
// ==========================================

const completeInterview = async (req, res, next) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.userId;
    const { timedOut = false } = req.body || {};

    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        message: "Interview is already completed",
      });
    }

    const now = new Date();
    const effectiveExpiresAt =
      interview.expiresAt ||
      new Date(interview.createdAt.getTime() + (interview.durationMinutes || 20) * 60 * 1000);
    const isActuallyTimedOut = timedOut || now >= new Date(effectiveExpiresAt);

    const minimumQuestions =
      interview.interviewPlan?.interviewStrategy?.questionRange?.minimum || 5;

    if (!isActuallyTimedOut && interview.currentQuestion < minimumQuestions) {
      return res.status(400).json({
        message: `Minimum ${minimumQuestions} questions are required to complete the interview`,
      });
    }

    const finalReport = await generateFinalReport(interview);

    interview.finalReport = finalReport;
    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
      message: "Interview completed successfully",
      interview,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// EXPORT CONTROLLERS
// ==========================================

module.exports = {
  createInterview,
  getMyInterviews,
  getInterviewById,
  updateInterview,
  deleteInterview,
  completeInterview,
  getNextQuestion,
  submitAnswer,
};
