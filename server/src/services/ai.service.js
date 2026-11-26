const { GoogleGenAI } = require("@google/genai");

const {
  interviewPlanSchema,
} = require("../validators/interviewPlan.validator");
const { questionSchema } = require("../validators/question.validator");
const { answerEvaluationSchema } = require("../validators/answer.validator");
const { finalReportSchema } = require("../validators/finalReport.validator");
const { followUpSchema } = require("../validators/followUp.validators");

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

let ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

/**
 * Structured logger for AI operations
 */
const logAiEvent = (level, event, metadata = {}) => {
  const payload = {
    timestamp: new Date().toISOString(),
    event,
    ...metadata,
  };

  if (payload.error && typeof payload.error === "object") {
    payload.error = {
      message: payload.error.message,
      status: payload.error.status || payload.error.statusCode || payload.error.response?.status,
      code: payload.error.code,
    };
  }

  const logString = `[AI Service ${level.toUpperCase()}] ${JSON.stringify(payload)}`;
  if (level === "error") {
    console.error(logString);
  } else if (level === "warn") {
    console.warn(logString);
  } else {
    console.log(logString);
  }
};

/**
 * Classifies an error as transient (retryable) or permanent (non-retryable).
 * Permanent errors (400, 401, 403, 404, invalid keys) must NOT be retried.
 */
const isRetryableError = (error) => {
  if (!error) return false;

  const status = error.status || error.statusCode || error.response?.status;

  // 1. Permanent HTTP errors (fail immediately)
  if (status && [400, 401, 403, 404].includes(status)) {
    return false;
  }

  const message = (error.message || "").toLowerCase();
  const code = (error.code || "").toLowerCase();

  // 2. Explicit non-retryable error signatures
  if (
    message.includes("api_key_invalid") ||
    message.includes("api key not valid") ||
    message.includes("unauthenticated") ||
    message.includes("permission_denied") ||
    message.includes("invalid_argument") ||
    message.includes("bad request") ||
    code === "invalid_argument" ||
    code === "permission_denied"
  ) {
    return false;
  }

  // 3. Transient HTTP status codes (429 rate limits, 5xx server errors)
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }

  // 4. Transient error messages & network conditions
  if (
    message.includes("429") ||
    message.includes("503") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("504") ||
    message.includes("rate limit") ||
    message.includes("resource_exhausted") ||
    message.includes("resource exhausted") ||
    message.includes("unavailable") ||
    message.includes("high demand") ||
    message.includes("deadline_exceeded") ||
    message.includes("timed out") ||
    message.includes("timeout") ||
    message.includes("fetch failed") ||
    message.includes("econnreset") ||
    message.includes("etimedout") ||
    code === "econnreset" ||
    code === "etimedout" ||
    code === "resource_exhausted" ||
    code === "unavailable"
  ) {
    return true;
  }

  return false;
};

/**
 * Extracts Retry-After delay in milliseconds if provided by the API response or error message.
 */
const extractRetryAfterMs = (error) => {
  if (!error) return null;

  // Check HTTP response headers
  let headerVal = null;
  const headers = error.response?.headers || error.headers;
  if (headers) {
    if (typeof headers.get === "function") {
      headerVal = headers.get("retry-after") || headers.get("Retry-After");
    } else if (typeof headers === "object") {
      headerVal = headers["retry-after"] || headers["Retry-After"];
    }
  }

  if (headerVal) {
    const numericSeconds = parseFloat(headerVal);
    if (!isNaN(numericSeconds) && numericSeconds > 0) {
      return Math.round(numericSeconds * 1000);
    }
    const parsedDate = Date.parse(headerVal);
    if (!isNaN(parsedDate)) {
      const diffMs = parsedDate - Date.now();
      if (diffMs > 0) return diffMs;
    }
  }

  // Check error message string for "retry after X seconds" or "retry in Xs"
  const message = error.message || "";
  const match = message.match(/retry (?:after|in) ([\d.]+)\s*(s|sec|seconds?|ms)?/i);
  if (match) {
    const val = parseFloat(match[1]);
    const unit = (match[2] || "s").toLowerCase();
    if (!isNaN(val) && val > 0) {
      if (unit.startsWith("ms")) {
        return Math.round(val);
      }
      return Math.round(val * 1000);
    }
  }

  return null;
};

/**
 * Calculates exponential backoff with decorrelated jitter.
 * Base guaranteed backoff prevents immediate re-spikes; jitter prevents the thundering herd.
 */
const calculateBackoffWithJitter = (
  attempt,
  initialDelayMs = 1000,
  maxDelayMs = 10000
) => {
  const exponential = Math.min(
    maxDelayMs,
    initialDelayMs * Math.pow(2, attempt - 1)
  );
  const base = Math.floor(exponential * 0.5);
  const jitter = Math.floor(Math.random() * (exponential * 0.5 + 1));
  return base + jitter;
};

/**
 * Wraps a promise with an absolute timeout to prevent hung network sockets.
 */
const withTimeout = (promise, ms, operationName) => {
  let timerId;
  const timeoutPromise = new Promise((_, reject) => {
    timerId = setTimeout(() => {
      const err = new Error(
        `Gemini API call timed out after ${ms}ms in ${operationName}`
      );
      err.code = "ETIMEDOUT";
      err.status = 504;
      reject(err);
    }, ms);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    clearTimeout(timerId);
  });
};

/**
 * Central retry mechanism for all Gemini API calls.
 * Handles transient retries, exponential backoff with jitter, Retry-After header,
 * timeout protection, and fast failure for permanent errors.
 */
const callGeminiWithRetry = async (params, options = {}) => {
  const {
    operationName = "callGemini",
    maxAttempts = 3,
    initialDelayMs = 1000,
    maxDelayMs = 10000,
    timeoutMs = 30000,
  } = options;

  let lastError;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      logAiEvent("info", "Executing Gemini request", {
        operationName,
        attempt,
        maxAttempts,
      });

      const response = await withTimeout(
        ai.models.generateContent(params),
        timeoutMs,
        operationName
      );

      return response;
    } catch (err) {
      lastError = err;
      const isRetryable = isRetryableError(err);
      const retryAfterMs = extractRetryAfterMs(err);

      // Fast fail: do not retry permanent errors or if attempts exhausted
      if (!isRetryable || attempt >= maxAttempts) {
        logAiEvent("error", "Gemini request failed", {
          operationName,
          attempt,
          maxAttempts,
          isRetryable,
          reason: !isRetryable
            ? "Permanent error (non-retryable)"
            : "Max retry attempts exhausted",
          error: err,
        });
        throw err;
      }

      // Calculate delay: respect Retry-After header if present, otherwise exponential backoff + jitter
      let delayMs;
      if (retryAfterMs !== null && retryAfterMs > 0) {
        delayMs = Math.min(retryAfterMs, 30000);
      } else {
        delayMs = calculateBackoffWithJitter(
          attempt,
          initialDelayMs,
          maxDelayMs
        );
      }

      logAiEvent("warn", "Transient Gemini error encountered, scheduling retry", {
        operationName,
        attempt,
        maxAttempts,
        nextAttempt: attempt + 1,
        delayMs,
        retryAfterRespected: Boolean(retryAfterMs),
        error: err,
      });

      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }

  throw lastError;
};

/**
 * Cleans Markdown wrappers and parses JSON response from Gemini
 */
const parseCleanJsonResponse = (text, operationName) => {
  if (!text || typeof text !== "string") {
    throw new Error(
      `Empty or invalid response received from Gemini in ${operationName}`
    );
  }

  const cleanedText = text
    .replace(/```json/gi, "")
    .replace(/```/g, "")
    .trim();

  try {
    return JSON.parse(cleanedText);
  } catch (err) {
    logAiEvent("error", "Failed to parse Gemini response as JSON", {
      operationName,
      rawPreview: cleanedText.slice(0, 200),
      parseError: err.message,
    });
    throw new Error(
      `Invalid JSON returned by Gemini in ${operationName}: ${err.message}`
    );
  }
};

const testGeminiConnection = async () => {
  try {
    const response = await callGeminiWithRetry(
      {
        model: "gemini-3.5-flash-lite",
        contents: "Say hello from my AI Interview Agent in one sentence.",
      },
      { operationName: "testGeminiConnection" }
    );

    return response.text;
  } catch (error) {
    logAiEvent("error", "Gemini connection test failed", {
      operationName: "testGeminiConnection",
      error,
    });
    throw error;
  }
};

const generateInterviewPlan = async ({
  role,
  difficulty,
  jobDescription,
  resumeText,
}) => {
  try {
    const resume = resumeText?.trim()
      ? resumeText
      : "No resume was provided. Do not assume or invent any candidate experience.";

    const prompt = `
You are an expert technical interviewer designing a realistic one-on-one interview.

Your task is to create an adaptive interview strategy based on:

- The candidate's role
- The selected interview difficulty
- The job description
- The candidate's resume

The goal is to assess the candidate realistically rather than generate a fixed questionnaire.

IMPORTANT RULES:

1. Do NOT generate interview questions yet.
2. Create only the interview blueprint.
3. The interview must be adaptive.
4. Do not invent, assume, or fabricate candidate experience that is not present in the resume.
5. Give greater emphasis to areas that are important to the job.
6. A technically heavy job description should result in greater technical emphasis.
7. Relevant projects should be investigated deeply to assess:
   - the candidate's actual contribution
   - technical understanding
   - architecture decisions
   - implementation details
   - trade-offs
   - challenges encountered
   - failure handling
   - scalability
   - security
   - originality and ownership
8. Resume-based assessment should identify claims and experience that should be verified.
9. Project-based assessment should focus specifically on deep investigation of projects mentioned in the resume.
10. Problem-solving assessment should reflect both the role and the selected difficulty.
11. Behavioral assessment must focus on workplace behavior and mindset, NOT technical knowledge.
12. Behavioral competencies may include:
   - communication
   - ownership
   - accountability
   - conflict resolution
   - adaptability
   - prioritization
   - leadership
   - handling feedback
   - decision making
   - working under pressure
13. Behavioral scenarios may involve:
   - team conflict
   - disagreement with a manager
   - deadline pressure
   - ambiguous requirements
   - competing priorities
   - taking responsibility for a mistake
   - receiving criticism
   - ethical dilemmas
   - difficult stakeholder situations
14. Do not turn behavioral scenarios into technical problem-solving questions.
15. The interview must be bounded between 15 and 25 questions overall.
16. The numbers 15 and 25 represent the overall interview range, NOT a fixed number of questions for each category.
17. The interview must never contain fewer than 15 questions.
18. The interview must never exceed 25 questions.
19. Category priorities represent assessment importance, not a fixed percentage of questions.
20. The actual number and order of questions will be decided by the adaptive interview engine based on the candidate's answers.

primaryFocus:
- technical
- resumeBased
- projectBased
- problemSolving
- behavioral

priority:
- low
- medium
- high
- critical

targetDepth:
- surface
- moderate
- deep
- very-deep

problemSolving difficulty:
- easy
- medium
- hard

CANDIDATE INFORMATION:

ROLE:
${role}

DIFFICULTY:
${difficulty}

JOB DESCRIPTION:
${jobDescription}

RESUME:
${resume}

OUTPUT REQUIREMENTS:

Return ONLY valid JSON.

Do not include:
- Markdown
- Code fences
- Explanations
- Comments
- Additional text before or after the JSON

Use exactly this structure:

{
  "interviewStrategy": {
    "primaryFocus": "<choose one allowed primaryFocus>",
    "questionRange": {
      "minimum": 5,
      "maximum": 15
    }
  },

  "technical": {
    "priority": "<choose one allowed priority>",
    "topics": [],
    "targetDepth": "<choose one allowed targetDepth>"
  },

  "resumeBased": {
    "priority": "<choose one allowed priority>",
    "areas": [],
    "targetDepth": "<choose one allowed targetDepth>"
  },

  "projectBased": {
    "priority": "<choose one allowed priority>",
    "projects": [
      {
        "name": "",
        "technologies": [],
        "areasToProbe": [],
        "targetDepth": "<choose one allowed targetDepth>"
      }
    ]
  },

  "problemSolving": {
    "priority": "<choose one allowed priority>",
    "areas": [],
    "difficulty": "<choose one allowed problemSolving difficulty>"
  },

  "behavioral": {
    "priority": "<choose one allowed priority>",
    "competencies": [],
    "scenarioTypes": []
  }
}
`;

    const response = await callGeminiWithRetry(
      {
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      },
      { operationName: "generateInterviewPlan" }
    );

    const plan = parseCleanJsonResponse(response.text, "generateInterviewPlan");
    const validatePlan = interviewPlanSchema.parse(plan);

    return validatePlan;
  } catch (error) {
    logAiEvent("error", "Interview plan generation failed", {
      operationName: "generateInterviewPlan",
      error,
    });
    throw error;
  }
};

const PHASES = [
  "warmup",
  "resume",
  "technical",
  "problem_solving",
  "behavioral",
];

const PHASE_TIME_BUDGETS_MINUTES = {
  warmup: 2,
  resume: 4,
  technical: 6,
  problem_solving: 5,
  behavioral: 3,
};

/**
 * Determines the next phase based on interview elapsed time and conversation progress.
 * Sequence: warmup -> resume -> technical -> problem_solving -> behavioral
 * Rules:
 * - Never backwards.
 * - Follow-ups stay inside the current phase.
 * - Timer budgets (2, 4, 6, 5, 3 min) guide forward progression.
 */
const determineNextPhase = (interview, isFollowup = false) => {
  const currentPhase = interview.currentPhase || "warmup";
  const currentIndex = PHASES.indexOf(currentPhase);
  const safeCurrentIndex = currentIndex === -1 ? 0 : currentIndex;

  if (isFollowup) {
    return PHASES[safeCurrentIndex];
  }

  // Calculate elapsed time in minutes
  const createdAt = interview.createdAt ? new Date(interview.createdAt) : new Date();
  const elapsedMinutes = Math.max(0, (Date.now() - createdAt.getTime()) / (60 * 1000));

  // Cumulative threshold in minutes for each phase:
  // warmup: 0-2 min
  // resume: 2-6 min
  // technical: 6-12 min
  // problem_solving: 12-17 min
  // behavioral: 17-20 min
  const cumulativeBudgets = [2, 6, 12, 17, 20];
  let targetIndex = safeCurrentIndex;

  for (let i = 0; i < cumulativeBudgets.length; i++) {
    if (elapsedMinutes >= cumulativeBudgets[i]) {
      targetIndex = Math.max(targetIndex, i + 1);
    }
  }

  // Also advance if questions in current phase have reached quota
  const conversation = interview.conversation || [];
  const questionsInCurrentPhase = conversation.filter(
    (q) => (q.phase || q.category) === PHASES[safeCurrentIndex]
  ).length;

  if (questionsInCurrentPhase >= 2 && targetIndex === safeCurrentIndex) {
    targetIndex = safeCurrentIndex + 1;
  }

  // Cap at final phase (never backward, max behavioral)
  const finalIndex = Math.min(Math.max(safeCurrentIndex, targetIndex), PHASES.length - 1);
  return PHASES[finalIndex];
};

const generateQuestion = async (interview, targetPhase = null) => {
  try {
    const isFirstQuestion = !interview.conversation || interview.conversation.length === 0;
    const phase = targetPhase || determineNextPhase(interview, false);

    const prompt = `
You are an expert technical interviewer conducting a realistic 20-minute adaptive interview.

ROLE (TITLE):
${interview.role}

CURRENT PHASE:
${phase}
Allowed phases in strict sequential order: warmup, resume, technical, problem_solving, behavioral.

DIFFICULTY:
${interview.difficulty}

JOB DESCRIPTION:
${interview.jobDescription}

RESUME:
${interview.resumeText}

PREVIOUS CONVERSATION:
${JSON.stringify(interview.conversation || [], null, 2)}

IS FIRST QUESTION:
${isFirstQuestion}

PHASE DEFINITIONS & TIME BUDGETS (total 20 min):
1. warmup (2 min): Brief rapport building, icebreaker, or introduction to the session.
2. resume (4 min): Specific questions probing claims, achievements, or projects on the candidate's resume.
3. technical (6 min): Deep dive into core technical concepts, architecture, or tools required for the role.
4. problem_solving (5 min): Real-world scenario, debugging, or design trade-off question.
5. behavioral (3 min): Workplace behavioral question (communication, conflict, ownership, handling failure).

RULES:
1. Ask exactly ONE question. 1 to 2 sentences maximum. No greeting inside the question, no interviewer notes.
2. The question must strictly belong to the "${phase}" phase.
3. "based_on": specify the exact project, technology, or requirement from the candidate's resume or the job description that prompted this question.
4. "is_followup": false (this is a primary phase question).
5. "transition": a natural, professional transition phrase leading into this phase/topic (or null if first question).
${
  isFirstQuestion
    ? `6. "greeting": Since this is question 1, include a brief, courteous 1-sentence greeting to the candidate welcoming them to the interview (e.g. "Welcome to your interview for the ${interview.role} position; let's get started."). For subsequent questions this will be omitted.`
    : `6. Do NOT include any greeting.`
}

Return ONLY valid JSON matching this schema:
{
  "phase": "${phase}",
  "question": "1-2 sentence question without greeting or notes",
  "is_followup": false,
  "based_on": "specific skill, project, or JD requirement",
  "transition": ${isFirstQuestion ? "null" : '"string transition or null"'}
  ${isFirstQuestion ? ',\n  "greeting": "Brief 1-sentence greeting"' : ""}
}
`;

    const response = await callGeminiWithRetry(
      {
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      },
      { operationName: "generateQuestion" }
    );

    const question = parseCleanJsonResponse(
      response.text,
      "generateQuestion"
    );

    question.phase = question.phase || phase;
    question.is_followup = false;
    question.based_on = question.based_on || interview.role;
    question.transition = question.transition || null;
    if (!question.category) {
      // populate legacy category mapping
      const categoryPhaseMap = {
        warmup: "behavioral",
        resume: "resumeBased",
        technical: "technical",
        problem_solving: "problemSolving",
        behavioral: "behavioral",
      };
      question.category = categoryPhaseMap[phase] || "technical";
      question.topic = question.based_on;
      question.reason = question.transition || `Assessment for ${phase}`;
    }

    const validatedQuestion = questionSchema.parse(question);
    return validatedQuestion;
  } catch (error) {
    logAiEvent("error", "Question generation failed", {
      operationName: "generateQuestion",
      error,
    });
    throw error;
  }
};

async function evaluateAnswer(interview, question, answer) {
  const prompt = `
You are an expert technical interviewer evaluating an answer in a 20-minute adaptive interview.

CRITICAL TONE & AUDIENCE REQUIREMENT:
Write directly to the user as "you" (second person). Never say "the candidate" or "the applicant".

ROLE:
${interview.role}

DIFFICULTY:
${interview.difficulty}

JOB DESCRIPTION:
${interview.jobDescription}

RESUME CONTEXT (candidate's actual background):
${interview.resumeText}

INTERVIEW QUESTION:
${question}

USER'S ANSWER:
${answer}

EVALUATION RULES:
1. "score": an integer 0-100 reflecting overall answer quality.
2. "headline": a concise 1-sentence verdict addressed to "you" (e.g. "You clearly articulated the trade-offs between SQL and NoSQL, but missed caching strategies.").
3. "strengths": exactly 2 concise bullet points describing what you did well (e.g. ["You gave a concrete production example.", "You addressed latency trade-offs directly."]).
4. "improvements": exactly 2 actionable bullet points on what you should improve (e.g. ["You should explicitly state your cache invalidation strategy.", "Quantify the performance impact with metrics."]).
5. "subscores": an object with scores 0-100 for each of:
   - "structure": how well organized and structured your response was.
   - "depth": technical rigor and understanding of mechanics.
   - "impact": clarity of business/technical outcome and ownership.
   - "relevance": how directly you answered the prompt.
6. "stronger_answer": a concrete, rewritten model answer demonstrating how you could have answered this question more strongly, incorporating your own project or experience from your resume.
7. "enough_signal": boolean indicating whether this answer provided sufficient signal on the topic (true) or if significant ambiguity/gaps remain (false).
8. "reason": a short explanation of why signal is sufficient or what remains to be probed.

Return ONLY valid JSON matching this schema:
{
  "score": 0,
  "headline": "One sentence summary addressed to you",
  "strengths": ["Strength 1", "Strength 2"],
  "improvements": ["Improvement 1", "Improvement 2"],
  "subscores": {
    "structure": 0,
    "depth": 0,
    "impact": 0,
    "relevance": 0
  },
  "stronger_answer": "Rewritten answer using your project",
  "enough_signal": true,
  "reason": "Brief rationale for signal assessment"
}
`;

  try {
    const response = await callGeminiWithRetry(
      {
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      },
      { operationName: "evaluateAnswer" }
    );

    const evaluation = parseCleanJsonResponse(
      response.text,
      "evaluateAnswer"
    );

    // Populate backward-compatible fields if omitted
    if (!evaluation.evaluation) {
      evaluation.evaluation = evaluation.headline;
    }
    if (!evaluation.weaknesses) {
      evaluation.weaknesses = evaluation.improvements || [];
    }

    const validateEvaluation = answerEvaluationSchema.parse(evaluation);

    return validateEvaluation;
  } catch (error) {
    logAiEvent("error", "Answer evaluation failed", {
      operationName: "evaluateAnswer",
      error,
    });
    throw error;
  }
}

const generateFollowUp = async (interview, question, answer, evaluation) => {
  const currentPhase = interview.currentPhase || "warmup";
  const prompt = `
You are an expert technical interviewer conducting an adaptive 20-minute interview.

INTERVIEW PHASES (in strict forward order):
warmup (2 min) -> resume (4 min) -> technical (6 min) -> problem_solving (5 min) -> behavioral (3 min).
Follow-ups MUST stay inside the current phase: "${currentPhase}".

ROLE: ${interview.role}
CURRENT PHASE: ${currentPhase}
DIFFICULTY: ${interview.difficulty}

JOB DESCRIPTION:
${interview.jobDescription || "Not provided"}

RESUME:
${interview.resumeText || "Not provided"}

CURRENT QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

EVALUATION:
${JSON.stringify(evaluation, null, 2)}

PREVIOUS CONVERSATION:
${JSON.stringify(interview.conversation, null, 2)}

RULES:
1. "decision":
   - "follow_up": probe deeper into the CURRENT phase ("${currentPhase}") and current topic if the answer lacked depth or raised points worth investigating.
   - "new_topic": move to a new topic or the next phase.
   - "complete": end the interview if at least 5 questions have been answered and comprehensive signal has been gathered across the phases (or if approaching time limit).
2. If the current question count is less than 5, NEVER choose "complete".
3. If decision is "follow_up", "is_followup" must be true, and "phase" MUST remain "${currentPhase}".
4. "question": exactly 1-2 sentences. No greetings, no notes.
5. "based_on": specific project, skill, or requirement.
6. "transition": natural spoken transition leading into this question (or null).

Return ONLY valid JSON matching this structure:
{
  "decision": "follow_up" | "new_topic" | "complete",
  "phase": "${currentPhase}",
  "question": "1-2 sentence question (or empty string if completing)",
  "is_followup": true | false,
  "based_on": "specific project/skill/requirement",
  "transition": "transition phrase or null"
}
`;

  try {
    const response = await callGeminiWithRetry(
      {
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      },
      { operationName: "generateFollowUp" }
    );

    const followUp = parseCleanJsonResponse(
      response.text,
      "generateFollowUp"
    );

    followUp.phase = followUp.phase || currentPhase;
    followUp.is_followup = followUp.decision === "follow_up";
    followUp.based_on = followUp.based_on || interview.role;
    followUp.transition = followUp.transition || null;
    if (!followUp.category) {
      const categoryPhaseMap = {
        warmup: "behavioral",
        resume: "resumeBased",
        technical: "technical",
        problem_solving: "problemSolving",
        behavioral: "behavioral",
      };
      followUp.category = categoryPhaseMap[followUp.phase] || "technical";
      followUp.topic = followUp.based_on;
      followUp.reason = followUp.transition || `Follow-up for ${followUp.phase}`;
    }

    const validatorFollowUp = followUpSchema.parse(followUp);

    return validatorFollowUp;
  } catch (error) {
    logAiEvent("error", "Follow-up generation failed", {
      operationName: "generateFollowUp",
      error,
    });
    throw error;
  }
};

const generateFinalReport = async (interview) => {
  const prompt = `
You are an expert technical interviewer creating a final interview report.

ROLE:
${interview.role}

DIFFICULTY:
${interview.difficulty}

JOB DESCRIPTION:
${interview.jobDescription}

INTERVIEW CONVERSATION:
${JSON.stringify(interview.conversation, null, 2)}

EVALUATION RULES:

1. Analyze the candidate's performance across all answered questions.

2. Consider:
   - correctness
   - technical understanding
   - depth of knowledge
   - consistency
   - clarity of communication
   - ability to handle follow-up questions

3. Calculate a realistic overall score between 0 and 100.

4. Identify the candidate's strongest demonstrated skills.

5. Identify important weaknesses or knowledge gaps.

6. Provide practical recommendations for improvement.

7. Do not simply repeat the strengths and weaknesses from individual answers.
   Analyze the overall interview performance.
   
Return ONLY valid JSON.

Do not include:
- Markdown
- Code fences
- Explanations outside JSON
- Additional text

Use exactly this structure:

{
  "overallScore": 0,
  "strengths": [],
  "weaknesses": [],
  "recommendations": []
}
`;

  try {
    const response = await callGeminiWithRetry(
      {
        model: "gemini-3.5-flash-lite",
        contents: prompt,
      },
      { operationName: "generateFinalReport" }
    );

    const report = parseCleanJsonResponse(
      response.text,
      "generateFinalReport"
    );
    const validateReport = finalReportSchema.parse(report);

    return validateReport;
  } catch (error) {
    logAiEvent("error", "Final report generation failed", {
      operationName: "generateFinalReport",
      error,
    });
    throw error;
  }
};

const setAiClient = (mockClient) => {
  ai = mockClient;
};

const getAiClient = () => {
  return ai;
};

module.exports = {
  PHASES,
  PHASE_TIME_BUDGETS_MINUTES,
  determineNextPhase,
  testGeminiConnection,
  generateInterviewPlan,
  generateQuestion,
  evaluateAnswer,
  generateFollowUp,
  generateFinalReport,
  callGeminiWithRetry,
  isRetryableError,
  extractRetryAfterMs,
  calculateBackoffWithJitter,
  withTimeout,
  parseCleanJsonResponse,
  logAiEvent,
  setAiClient,
  getAiClient,
};
