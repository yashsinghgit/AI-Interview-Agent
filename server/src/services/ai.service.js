const { GoogleGenAI } = require("@google/genai");

const {
  interviewPlanSchema,
} = require("../validators/interviewPlan.validator");
const { questionSchema } = require("../validators/question.validator");
const { answerEvaluationSchema } = require("../validators/answer.validator");
const { finalReportSchema } = require("../validators/finalReport.validator");
const { followUpSchema } = require("../validators/followUp.validators");

const geminiApiKey = process.env.GEMINI_API_KEY?.trim();

console.log("Gemini API key configured:", Boolean(geminiApiKey));

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
});

const testGeminiConnection = async () => {
  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: "Say hello from my AI Interview Agent in one sentence.",
    });

    return response.text;
  } catch (error) {
    console.error("Gemini API Error:", error);
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
      "minimum": 15,
      "maximum": 25
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    const text = response.text;
    const plan = JSON.parse(text);

    const validatePlan = interviewPlanSchema.parse(plan);

    return validatePlan;
  } catch (error) {
    console.error("Interview Plan Generation Error:", error);
    throw error;
  }
};

const generateQuestion = async (interview) => {
  const prompt = `
  You are an expert technical interviewer conducting a realistic adaptive interview.

ROLE:
${interview.role}

DIFFICULTY:
${interview.difficulty}

JOB DESCRIPTION:
${interview.jobDescription}

RESUME:
${interview.resumeText}

INTERVIEW PLAN:
${JSON.stringify(interview.interviewPlan, null, 2)}

PREVIOUS CONVERSATION:
${JSON.stringify(interview.conversation, null, 2)}

CURRENT QUESTION NUMBER:
${interview.currentQuestion}

BEHAVIORAL QUESTION ASKED SO FAR:
$(interview.conversation.filter(
(item) => item.category === "behavioral"
).length)

Your task is to generate ONLY the next best interview question.

RULES:

1. Ask exactly ONE question.

2. Follow the interview plan and prioritize areas marked as "critical" or "high".

3. Consider previous questions and answers to avoid unnecessary repetition.

4. If a previous answer was weak or incomplete, you may ask a relevant follow-up question.

5. If the previous topic has been explored sufficiently,move to another important area.

6. Match the question difficulty to the selected difficulty level.

7. Make the question realistic, specific, and appropriate for the candidate's role.

8. The interview MUST contain at least 2 behavioral questions within the first 15 questions.

9. Behavioral questions MUST genuinely assess workplace behavior and mindset, such as:
   - teamwork
   - conflict resolution
   - handling feedback
   - working under pressure
   - prioritization
   - ownership
   - accountability
   - adaptability
   - decision making

10. If fewer than 2 behavioral questions have been asked and there are not enough remaining questions to naturally include 2 behavioral questions, you MUST generate a behavioral question now.

11. Do NOT turn a behavioral question into a technical question.

12. Behavioral questions should preferably use realistic workplace situations and encourage the candidate to explain their actions and decisions.

13. Once at least 2 behavioral questions have been asked, continue using the adaptive interview strategy normally.

14. The interview may continue beyond Question 15 when further assessment is useful.

15. NEVER choose "complete" before Question 15.

16. The category field MUST be exactly one of:
"technical"
"resumeBased"
"projectBased"
"problemSolving"
"behavioral"

Do not use hyphens or spaces in category values.


Return ONLY valid JSON in exactly this format:

{
  "question": "The interview question",
  "category": "technical",
  "topic": "Specific topic being tested",
  "reason": "Why this question was selected based on the interview plan and conversation"
}
`;

const response = await ai.models.generateContent({
  model: "gemini-3.5-flash-lite",
  contents: prompt,
});

const text = response.text;

const cleanedText = text
  .replace(/```json/g, "")
  .replace(/```/g, "")
  .trim();

const question = JSON.parse(cleanedText);

console.log("Gemini generated question:", question);

const categoryMap = {
  "resume-based": "resumeBased",
  "project-based": "projectBased",
  "problem-solving": "problemSolving",
};

if (categoryMap[question.category]) {
  question.category = categoryMap[question.category];
}

questionSchema.parse(question);

return question;

const evaluateAnswer = async (interview, question, answer) => {
  const prompt = `
  You are an expert technical interviewer evaluating a candidate's answer.

ROLE:
${interview.role}

DIFFICULTY:
${interview.difficulty}

JOB DESCRIPTION:
${interview.jobDescription}

INTERVIEW QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

Your task is to evaluate the candidate's answer fairly and realistically.

EVALUATION RULES:

1. Give a score between 0 and 100.

2. Evaluate the answer based on:
   - correctness
   - technical understanding
   - depth
   - clarity
   - relevance to the question

3. Do not give a high score just because the answer is long.

4. Do not be unnecessarily harsh.

5. Identify specific strengths demonstrated in the answer.

6. Identify specific weaknesses or missing concepts.

7. The evaluation should help the candidate understand how to improve.

Return ONLY valid JSON.

Do not include:
- Markdown
- Code fences
- Explanations outside JSON
- Additional text

Use exactly this structure:

{
  "score": 0,
  "evaluation": "Overall evaluation of the candidate's answer",
  "strengths": [],
  "weaknesses": []
}
 `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    const text = response.text;

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const evaluation = JSON.parse(cleanedText);

    const validateEvaluation = answerEvaluationSchema.parse(evaluation);

    return validateEvaluation;
  } catch (error) {
    console.error("Answer Evaluation Error : ", error);
    throw error;
  }
};

const generateFollowUp = async (interview, question, answer, evaluation) => {
  const prompt = `
You are an expert technical interviewer conducting an adaptive interview.

Your job is to decide whether the candidate should receive:
1. a follow-up question that continues probing the CURRENT topic, or
2. a new question that moves to a DIFFERENT important topic.

You must evaluate the candidate's latest answer using the interview context, current question, answer, and evaluation.

INTERVIEW CONTEXT:
Role: ${interview.role}
Difficulty: ${interview.difficulty}

JOB DESCRIPTION:
${interview.jobDescription || "Not provided"}

RESUME:
${interview.resumeText || "Not provided"}

CURRENT INTERVIEW PLAN:
${JSON.stringify(interview.interviewPlan, null, 2)}

CURRENT QUESTION:
${question}

CANDIDATE ANSWER:
${answer}

ANSWER EVALUATION:
${JSON.stringify(evaluation, null, 2)}

PREVIOUS CONVERSATION:
${JSON.stringify(interview.conversation, null, 2)}

DECISION RULES:

You have THREE possible decisions:

1. "follow_up"
2. "new_topic"
3. "complete"

Choose "follow_up" ONLY when:
- The candidate's answer is substantially incomplete.
- There is a significant technical misunderstanding.
- There is a significant weakness that is important for evaluating the candidate.
- The candidate made a questionable claim that needs verification.
- An important part of the question was not addressed.
- Further investigation of the CURRENT topic is genuinely useful for judging the candidate.

Choose "new_topic" when:
- The candidate demonstrated sufficient understanding of the current topic.
- The answer was strong, comprehensive, technically accurate, and relevant.
- Remaining omissions are minor or optional.
- Further questioning would only test increasingly obscure details.
- The current topic has already been explored sufficiently.
- The candidate has demonstrated enough knowledge to move to another important area.
- The candidate performed poorly on the current topic and further probing would not provide useful additional information.
- Another important topic from the interview plan should now be assessed.

Choose "complete" ONLY when:
- The current question number is AT LEAST 15.
- The candidate has demonstrated enough overall knowledge and competence.
- Additional questions are unlikely to provide meaningful additional evidence.
- The interview has covered enough important areas to make a reliable assessment.
- Ending the interview now is better than continuing to another topic.

IMPORTANT:
- NEVER choose "complete" before Question 15.
- The interview may continue beyond Question 15 if more assessment is useful.
- Question 25 is the absolute maximum. The backend will force completion at Question 25.
- A strong answer does NOT automatically mean "complete".
- At Question 15 or later, decide whether enough evidence has been collected to finish.
- If more assessment is useful, choose "new_topic" or "follow_up" instead.

OUTPUT:
Return ONLY valid JSON.
Do not include markdown.
Do not include code fences.
Do not include explanations outside the JSON.

If decision is "complete":
- Set "question" to an empty string.
- Set "category" to the category of the last assessed question.
- Set "topic" to the current topic.
- Explain briefly in "reason" why the interview should end.

Return exactly this structure:

{
  "decision": "follow_up" or "new_topic" or "complete",
  "question": "The next interview question, or an empty string if completing",
  "category": "technical" or "resumeBased" or "projectBased" or "problemSolving" or "behavioral",
  "topic": "Specific topic being assessed",
  "reason": "Brief explanation for why this decision and question were chosen"
}
  
`;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    const text = response.text;

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const followUp = JSON.parse(cleanedText);

    const validatorFollowUp = followUpSchema.parse(followUp);

    return validatorFollowUp;
  } catch (error) {
    console.error("Follow-Up Generation Error:", error);
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
    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash-lite",
      contents: prompt,
    });

    const text = response.text;

    const cleanedText = text
      .replace(/```json/g, "")
      .replace(/```/g, "")
      .trim();

    const report = JSON.parse(cleanedText);
    const validateReport = finalReportSchema.parse(report);

    return validateReport;
  } catch (error) {
    console.error("Final Report Generation Error:", error);
    throw error;
  }
};

module.exports = {
  testGeminiConnection,
  generateInterviewPlan,
  generateQuestion,
  evaluateAnswer,
  generateFollowUp,
  generateFinalReport,
};
