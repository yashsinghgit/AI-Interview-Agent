const Interview = require("../models/interview.model");

const {
  generateInterviewPlan,
  generateQuestion,
  evaluateAnswer,
  generateFollowUp,
  generateFinalReport,
} = require("../services/ai.service");

// ==========================================
// CREATE INTERVIEW
// ==========================================

const createInterview = async (req, res, next) => {
  try {
    const { role, difficulty, jobDescription, resumeText } = req.body;

    const userId = req.user.userId;

    if (!role || !difficulty || !jobDescription) {
      return res.status(400).json({
        message: "Role, difficulty, and job description are required",
      });
    }

    const interviewPlan = await generateInterviewPlan({
      role,
      difficulty,
      jobDescription,
      resumeText: resumeText || "",
    });

    const interview = await Interview.create({
      user: userId,
      role,
      difficulty,
      jobDescription,
      resumeText: resumeText || "",
      interviewPlan,
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
// GET ALL MY INTERVIEWS
// ==========================================

const getMyInterviews = async (req, res, next) => {
  try {
    const userId = req.user.userId;

    const interviews = await Interview.find({
      user: userId,
    }).sort({ createdAt: -1 });

    return res.status(200).json({
      message: "Interviews retrieved successfully",
      interviews,
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

    return res.status(200).json({
      message: "Interview retrieved successfully",
      interview,
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
// GENERATE NEXT QUESTION
// ==========================================

const getNextQuestion = async (req, res, next) => {
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
        message: "You are not authorized to access this interview",
      });
    }

    if (interview.status === "completed") {
      return res.status(400).json({
        message: "This interview has already been completed",
      });
    }

    const maximumQuestions =
      interview.interviewPlan.interviewStrategy.questionRange.maximum;

    if (interview.currentQuestion >= maximumQuestions) {
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

    const generatedQuestion = await generateQuestion(interview);

    interview.conversation.push({
      question: generatedQuestion.question,
      category: generatedQuestion.category,
      topic: generatedQuestion.topic,
      reason: generatedQuestion.reason,
    });
    interview.currentQuestion += 1;

    await interview.save();

    return res.status(200).json({
      message: "Question generated successfully",
      question: {
        number: interview.currentQuestion,
        ...generatedQuestion,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// SUBMIT ANSWER
// ==========================================

const submitAnswer = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    const userId = req.user.userId;

    // ------------------------------------------
    // Validate answer
    // ------------------------------------------

    if (!answer || !answer.trim()) {
      return res.status(400).json({
        message: "Answer is required",
      });
    }

    // ------------------------------------------
    // Find interview
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

    // ------------------------------------------
    // Find current unanswered question
    // ------------------------------------------

    const conversation = interview.conversation;

    const currentQuestion = conversation[conversation.length - 1];

    if (!currentQuestion || currentQuestion.answer) {
      return res.status(400).json({
        message: "No unanswered question found",
      });
    }

    console.log("Current Question Number:", interview.currentQuestion);

    // ------------------------------------------
    // Evaluate answer
    // ------------------------------------------

    const evaluation = await evaluateAnswer(
      interview,
      currentQuestion.question,
      answer,
    );

    // ------------------------------------------
    // Save answer + evaluation
    // ------------------------------------------

    currentQuestion.answer = answer;
    currentQuestion.score = evaluation.score;
    currentQuestion.evaluation = evaluation.evaluation;
    currentQuestion.strengths = evaluation.strengths;
    currentQuestion.weaknesses = evaluation.weaknesses;

    await interview.save();

    // ------------------------------------------
    // Get question limits
    // ------------------------------------------

    const minimumQuestions =
      interview.interviewPlan.interviewStrategy.questionRange.minimum;

    const maximumQuestions =
      interview.interviewPlan.interviewStrategy.questionRange.maximum;

    console.log("Minimum Questions Limit:", minimumQuestions);

    console.log("Maximum Questions Limit:", maximumQuestions);

    // ==========================================
    // HARD MAXIMUM
    // ==========================================

    if (interview.currentQuestion >= maximumQuestions) {
      console.log("Maximum question limit reached. Completing interview.");

      const finalReport = await generateFinalReport(interview);

      interview.finalReport = finalReport;
      interview.status = "completed";

      await interview.save();

      return res.status(200).json({
        message: "Answer evaluated and interview completed successfully",
        evaluation,
        finalReport,
      });
    }

    // ==========================================
    // ADAPTIVE ENGINE
    // ==========================================

    let followUp;

    try {
      followUp = await generateFollowUp(
        interview,
        currentQuestion.question,
        answer,
        evaluation,
      );
    } catch (error) {
      console.error(
        "Follow-up generation failed. Falling back to a new question:",
        error,
      );

      followUp = {
        decision: "new_topic",
      };
    }

    console.log("Adaptive Decision:", followUp.decision);
    console.log("Adaptive Topic:", followUp.topic);

    // ==========================================
    // ADAPTIVE COMPLETION
    // ==========================================

    if (
      followUp.decision === "complete" &&
      interview.currentQuestion >= minimumQuestions
    ) {
      console.log("Adaptive engine decided to complete interview.");

      const finalReport = await generateFinalReport(interview);

      interview.finalReport = finalReport;
      interview.status = "completed";

      await interview.save();

      return res.status(200).json({
        message: "Interview completed successfully",
        evaluation,
        finalReport,
      });
    }

    // ==========================================
    // FOLLOW-UP QUESTION
    // ==========================================

    if (followUp.decision === "follow_up" && interview.followUpCount < 2) {
      interview.conversation.push({
        question: followUp.question,
        category: followUp.category,
        topic: followUp.topic,
        reason: followUp.reason,
      });

      interview.followUpCount += 1;
      interview.currentQuestion += 1;
      interview.currentTopic = followUp.topic;

      await interview.save();

      return res.status(200).json({
        message:
          "Answer evaluated and adaptive follow-up generated successfully",
        evaluation,
        question: {
          number: interview.currentQuestion,
          ...followUp,
        },
      });
    }

    // ==========================================
    // NEW TOPIC
    // ==========================================

    const nextQuestion = await generateQuestion(interview);

    interview.conversation.push({
      question: nextQuestion.question,
      category: nextQuestion.category,
      topic: nextQuestion.topic,
      reason: nextQuestion.reason,
    });

    interview.currentQuestion += 1;

    // Reset follow-up count for the new topic
    interview.followUpCount = 0;

    interview.currentTopic = nextQuestion.topic;

    await interview.save();

    return res.status(200).json({
      message: "Answer evaluated and next question generated successfully",
      evaluation,
      question: {
        number: interview.currentQuestion,
        ...nextQuestion,
      },
    });
  } catch (error) {
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

    const minimumQuestions =
      interview.interviewPlan.interviewStrategy.questionRange.minimum;

    if (!timedOut && interview.currentQuestion < minimumQuestions) {
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
  completeInterview,
  getNextQuestion,
  submitAnswer,
};
