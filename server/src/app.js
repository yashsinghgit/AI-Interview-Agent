const express = require("express");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const interviewRoutes = require("./routes/interview.routes");
const aiRoutes = require("./routes/ai.routes");
const errorMiddleware = require("./middleware/error.middleware");

const app = express();

app.use(express.json());

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", interviewRoutes);
app.use("/", aiRoutes);

app.use(errorMiddleware);

module.exports = app; 