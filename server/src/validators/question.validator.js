const { z } = require("zod");

const questionSchema = z.object({
  phase: z.enum([
    "warmup",
    "resume",
    "technical",
    "problem_solving",
    "behavioral",
  ]),

  question: z.string().min(1),

  is_followup: z.boolean(),

  based_on: z.string().min(1),

  transition: z.string().nullable().optional(),

  greeting: z.string().nullable().optional(),

  // Optional backward-compatibility fields
  category: z.string().optional(),
  topic: z.string().optional(),
  reason: z.string().optional(),
});

module.exports = {
  questionSchema,
};
