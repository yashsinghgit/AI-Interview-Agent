const { z } = require("zod");

const testInterviewPlanSchema = z
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

module.exports = {
  testInterviewPlanSchema,
};
