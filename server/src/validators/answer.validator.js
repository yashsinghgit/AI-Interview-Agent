const { z } = require("zod");

const answerEvaluationSchema = z.object({
  score: z
    .number()
    .min(0)
    .max(100),

  evaluation: z
    .string()
    .min(1),

  strengths: z
    .array(z.string()),

  weaknesses: z
    .array(z.string()),
});

module.exports = {
  answerEvaluationSchema,
};