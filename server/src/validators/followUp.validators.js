const {z} = require("zod");

const followUpSchema = z.object({
  decision: z.enum(["follow_up", "new_topic"]),
  question: z.string(),
  category: z.enum([
    "technical",
    "resumeBased",
    "projectBased",
    "problemSolving",
    "behavioral",
  ]),
  topic: z.string(),
  reason: z.string(),
});

module.exports = {
    followUpSchema,
}