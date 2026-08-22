const { z } = require("zod");

const prioritySchema = z.enum([
  "low",
  "medium",
  "high",
  "critical",
]);

const targetDepthSchema = z.enum([
  "surface",
  "moderate",
  "deep",
  "very-deep",
]);

const interviewPlanSchema = z.object({
  interviewStrategy: z.object({
    primaryFocus: z.enum([
      "technical",
      "resumeBased",
      "projectBased",
      "problemSolving",
      "behavioral",
    ]),

    questionRange: z
      .object({
        minimum: z.number().int().min(15),
        maximum: z.number().int().max(25),
      })
      .refine(
        (range) => range.minimum <= range.maximum,
        {
          message:
            "Minimum question count cannot exceed maximum question count",
        }
      ),
  }),

  technical: z.object({
    priority: prioritySchema,
    topics: z.array(z.string()),
    targetDepth: targetDepthSchema,
  }),

  resumeBased: z.object({
    priority: prioritySchema,
    areas: z.array(z.string()),
    targetDepth: targetDepthSchema,
  }),

  projectBased: z.object({
    priority: prioritySchema,

    projects: z.array(
      z.object({
        name: z.string(),
        technologies: z.array(z.string()),
        areasToProbe: z.array(z.string()),
        targetDepth: targetDepthSchema,
      })
    ),
  }),

  problemSolving: z.object({
    priority: prioritySchema,
    areas: z.array(z.string()),
    difficulty: z.enum([
      "easy",
      "medium",
      "hard",
    ]),
  }),

  behavioral: z.object({
    priority: prioritySchema,
    competencies: z.array(z.string()),
    scenarioTypes: z.array(z.string()),
  }),
});

module.exports = {
  interviewPlanSchema,
};