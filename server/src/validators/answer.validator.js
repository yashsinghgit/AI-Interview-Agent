const { z } = require("zod");

const subscoresSchema = z.object({
  structure: z.number().min(0).max(100),
  depth: z.number().min(0).max(100),
  impact: z.number().min(0).max(100),
  relevance: z.number().min(0).max(100),
});

const answerEvaluationSchema = z.object({
  score: z.number().min(0).max(100),
  headline: z.string().min(1),
  strengths: z.array(z.string()),
  improvements: z.array(z.string()),
  subscores: subscoresSchema,
  stronger_answer: z.string().min(1),
  enough_signal: z.boolean(),
  reason: z.string().min(1),

  // Backward compatibility fields
  evaluation: z.string().optional(),
  weaknesses: z.array(z.string()).optional(),
});

module.exports = {
  answerEvaluationSchema,
};
