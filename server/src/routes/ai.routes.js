const express = require("express");

const router = express.Router();

const authMiddleware = require("../middleware/auth.middleware");
const validate = require("../middleware/validate.middleware");
const {
  testInterviewPlanSchema,
} = require("../validators/aiRequest.validator");

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
    validate({ body: testInterviewPlanSchema }),
    testInterviewPlan
);

module.exports = router;