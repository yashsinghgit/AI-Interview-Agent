const { z } = require("zod");

const finalReportSchema = z.object({
  overallScore: z.number().min(0).max(100),

  strengths: z.array(z.string()),

  weaknesses: z.array(z.string()),

  recommendations: z.array(z.string()),
});

module.exports = {
  finalReportSchema,
};