const { z } = require("zod");

// Standard 24-character hex MongoDB ObjectId regex
const objectIdRegex = /^[0-9a-fA-F]{24}$/;

const interviewIdParamSchema = z
  .object({
    id: z
      .string({ required_error: "Interview ID is required" })
      .regex(objectIdRegex, "Invalid interview ID format"),
  })
  .strict();

const createInterviewSchema = z
  .object({
    role: z
      .string({ required_error: "Role is required" })
      .trim()
      .min(2, "Role must be at least 2 characters long")
      .max(100, "Role must not exceed 100 characters"),
    difficulty: z.enum(["easy", "medium", "hard"], {
      errorMap: () => ({
        message: "Difficulty must be 'easy', 'medium', or 'hard'",
      }),
    }),
    jobDescription: z
      .string({ required_error: "Job description is required" })
      .trim()
      .min(10, "Job description must be at least 10 characters long")
      .max(10000, "Job description must not exceed 10,000 characters"),
    resumeText: z
      .string()
      .trim()
      .max(50000, "Resume text must not exceed 50,000 characters")
      .optional()
      .nullable(),
  })
  .strict();

const updateInterviewSchema = z
  .object({
    role: z
      .string()
      .trim()
      .min(2, "Role must be at least 2 characters long")
      .max(100, "Role must not exceed 100 characters")
      .optional(),
    difficulty: z.enum(["easy", "medium", "hard"]).optional(),
    jobDescription: z
      .string()
      .trim()
      .min(10, "Job description must be at least 10 characters long")
      .max(10000, "Job description must not exceed 10,000 characters")
      .optional(),
    resumeText: z
      .string()
      .trim()
      .max(50000, "Resume text must not exceed 50,000 characters")
      .optional()
      .nullable(),
  })
  .strict();

const getMyInterviewsQuerySchema = z
  .object({
    page: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === "") return 1;
        const parsed = parseInt(val, 10);
        return isNaN(parsed) || parsed < 1 ? 1 : parsed;
      }, z.number().int().min(1).default(1))
      .optional(),
    limit: z
      .preprocess((val) => {
        if (val === undefined || val === null || val === "") return 10;
        const parsed = parseInt(val, 10);
        if (isNaN(parsed) || parsed < 1) return 10;
        if (parsed > 50) return 50;
        return parsed;
      }, z.number().int().min(1).max(50).default(10))
      .optional(),
  })
  .passthrough();

const submitAnswerSchema = z
  .object({
    answer: z
      .string({ required_error: "Answer is required" })
      .trim()
      .min(1, "Answer cannot be empty")
      .max(10000, "Answer cannot exceed 10,000 characters"),
    questionId: z
      .string()
      .regex(objectIdRegex, "Invalid question ID format")
      .optional()
      .nullable(),
  })
  .strict();

module.exports = {
  objectIdRegex,
  interviewIdParamSchema,
  createInterviewSchema,
  updateInterviewSchema,
  getMyInterviewsQuerySchema,
  submitAnswerSchema,
};
