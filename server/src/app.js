const express = require("express");

const cors = require("cors");
const authRoutes = require("./routes/auth.routes");
const userRoutes = require("./routes/user.routes");
const interviewRoutes = require("./routes/interview.routes");
const aiRoutes = require("./routes/ai.routes");
const errorMiddleware = require("./middleware/error.middleware");
const connectDB = require("./db/db");

const app = express();

const allowedOrigins = new Set([
	"https://ai-interview-agent-omega-eight.vercel.app",
	"https://www.ai-interview-agent-omega-eight.vercel.app",
	"http://localhost:5173",
]);

const corsOptions = {
	origin: (origin, callback) => {
		if (!origin || allowedOrigins.has(origin)) {
			return callback(null, true);
		}

		return callback(new Error("Origin is not allowed by CORS"));
	},
	credentials: true,
	methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization"],
};

// CORS
app.use(cors(corsOptions));

app.use(express.json());

app.use(async (req, res, next) => {
	try {
		await connectDB();
		next();
	} catch (error) {
		next(error);
	}
});

app.use("/", authRoutes);
app.use("/", userRoutes);
app.use("/", interviewRoutes);
app.use("/", aiRoutes);

app.use(errorMiddleware);

module.exports = app;