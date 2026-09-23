const express = require("express");

const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const interviewRoutes = require("./routes/interview.routes");
const aiRoutes = require("./routes/ai.routes");
const errorMiddleware = require("./middleware/error.middleware");

const app = express();

const allowedOrigins = ['https://ai-interview-agent-omega-eight.vercel.app','ai-interview-agent-omega-eight.vercel.app', 'www.ai-interview-agent-omega-eight.vercel.app','http://localhost:5173']

// CORS
app.use(
 cors({ origin: allowedOrigins })
);

app.use(express.json());

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", interviewRoutes);
app.use("/", aiRoutes);

app.use(errorMiddleware);

module.exports = app;