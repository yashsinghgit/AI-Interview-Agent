const Interview = require("../models/interview.model");
const {
  generateInterviewPlan,
  generateQuestion,
  evaluateAnswer,
} = require("../services/ai.service");

//generate plan

// ==========================================
// CREATE INTERVIEW
// ==========================================

const createInterview = async (req, res) => {
  try {
    const { role, difficulty, jobDescription, resumeText } = req.body;

    const userId = req.user.userId;

    // Validate required fields
    if (!role || !difficulty || !jobDescription) {
      return res.status(400).json({
        message: "Role, difficulty, and job description are required",
      });
    }

    const interviewPlan = await generateInterviewPlan(
      role,
      difficulty,
      jobDescription,
      resumeText || "",
    );

    // Create interview
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
    console.error("Create Interview Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ==========================================
// GENERATE NEXT QUESTION
// ==========================================

const getNextQuestion = async (req, res) => {
  try {
    const { id } = req.params;

    const userId = req.user.userId;

    // Find the interview
    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    // Check ownership
    if (interview.user.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to access this interview",
      });
    }

    // Check interview status
    if (interview.status === "completed") {
      return res.status(400).json({
        message: "This interview has already been completed",
      });
    }

    // Generate the next question
    const generatedQuestion = await generateQuestion(interview);

    // Save the question in conversation
    interview.conversation.push({
      question: generatedQuestion.question,
    });

    // Move to the next question number
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
    console.error("Generate Question Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ==========================================
// GET ALL MY INTERVIEWS
// ==========================================

const getMyInterviews = async (req, res) => {
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
    console.error("Get Interviews Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ==========================================
// GET SINGLE INTERVIEW
// ==========================================

const getInterviewById = async (req, res) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.userId;

    // Find interview belonging to authenticated user
    console.log("Interview ID from URL:", interviewId);
    console.log("User ID from token:", userId);

    const interview = await Interview.findById(interviewId);

    console.log(
      "Interview user:",
      interview ? interview.user.toString() : "Not found",
    );

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    return res.status(200).json({
      message: "Interview retrieved successfully",
      interview,
    });
  } catch (error) {
    console.error("Get Interview Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ==========================================
// UPDATE INTERVIEW
// ==========================================

const updateInterview = async (req, res) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.userId;

    const { role, difficulty, jobDescription, resumeText } = req.body;

    // Find interview belonging to authenticated user
    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    // Update only fields that were provided
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
    console.error("Update Interview Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ==========================================
// COMPLETE INTERVIEW
// ==========================================

const completeInterview = async (req, res) => {
  try {
    const interviewId = req.params.id;
    const userId = req.user.userId;

    // Find interview belonging to authenticated user
    const interview = await Interview.findOne({
      _id: interviewId,
      user: userId,
    });

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    // Prevent completing an already completed interview
    if (interview.status === "completed") {
      return res.status(400).json({
        message: "Interview is already completed",
      });
    }

    interview.status = "completed";

    await interview.save();

    return res.status(200).json({
      message: "Interview completed successfully",
      interview,
    });
  } catch (error) {
    console.error("Complete Interview Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
  }
};

// ==========================================
// SUBMIT ANSWER
// ==========================================

const submitAnswer = async (req, res) => {
  try {
    const { id } = req.params;
    const { answer } = req.body;

    const userId = req.user.userId;

    // Validate answer
    if (!answer || !answer.trim()) {
      return res.status(400).json({
        message: "Answer is required",
      });
    }

    // Find the interview
    const interview = await Interview.findById(id);

    if (!interview) {
      return res.status(404).json({
        message: "Interview not found",
      });
    }

    // Check ownership
    if (interview.user.toString() !== userId) {
      return res.status(403).json({
        message: "You are not authorized to access this interview",
      });
    }

    // Check interview status
    if (interview.status === "completed") {
      return res.status(400).json({
        message: "This interview has already been completed",
      });
    }

    // Find the latest unanswered question
    const conversation = interview.conversation;

    const currentQuestion = [...conversation]
      .reverse()
      .find((item) => !item.answer);

    if (!currentQuestion) {
      return res.status(400).json({
        message: "No unanswered question found",
      });
    }

    const evaluation = await evaluateAnswer(
      interview,
      currentQuestion.question,
      answer,
    );

    // Save the candidate's answer and evaluation
    currentQuestion.answer = answer;

    currentQuestion.score = evaluation.score;

    currentQuestion.evaluation = evaluation.evaluation;

    currentQuestion.strengths = evaluation.strengths;

    currentQuestion.weaknesses = evaluation.weaknesses;

    await interview.save();

    return res.status(200).json({
      message: "Answer evaluated succesfully",
      evaluation,
    });
  } catch (error) {
    console.error("Submit Answer Error:", error);

    return res.status(500).json({
      message: "Internal server error",
    });
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
