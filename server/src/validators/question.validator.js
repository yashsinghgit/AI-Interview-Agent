const {z} = require("zod");

const questionSchema = z.object({
    question: z.string().min(1),

    category : z.enum([
        "technical",
        "resumeBased",
        "projectBased",
        "problemSolving",
        "behavioral",

    ]),

    topic : z.string().min(1),

    reason : z.string().min(1)
});

module.exports = {
    questionSchema,
};

