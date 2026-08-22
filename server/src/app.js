const express = require("express");

const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const interviewRoutes = require("./routes/interview.routes");
const aiRoutes = require("./routes/ai.routes");

const app = express();

app.use(express.json());

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", interviewRoutes);
app.use("/", aiRoutes);


module.exports = app; 