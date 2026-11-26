const { z } = require("zod");

const followUpSchema = z.object({
  decision: z.enum(["follow_up", "new_topic", "complete"]),
  phase: z.enum(["warmup", "resume", "technical", "problem_solving", "behavioral"]).optional(),
  question: z.string(),
  is_followup: z.boolean().optional(),
  based_on: z.string().optional(),
  transition: z.string().nullable().optional(),
  category: z.enum([
    "technical",
    "resumeBased",
    "projectBased",
    "problemSolving",
    "behavioral",
  ]).optional(),
  topic: z.string().optional(),
  reason: z.string().optional(),
});

module.exports = {
  followUpSchema,
};