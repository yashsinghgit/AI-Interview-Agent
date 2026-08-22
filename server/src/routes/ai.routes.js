const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");

const { 
    testAI,
    testInterviewPlan
 } = require("../controllers/ai.controller");

router.get("/test-ai",
    authMiddleware,
    testAI, 
);

router.post(
    "/test-interview-plan",
    authMiddleware,
    testInterviewPlan
)

module.exports = router ;