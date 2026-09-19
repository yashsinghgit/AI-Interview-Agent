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
};

async function evaluateAnswer(interview, question, answer) {
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
}

const generateFollowUp = async (interview, question, answer, evaluation) => {
  const prompt = `
You are an expert technical interviewer conducting an adaptive interview.

Your job is to decide what the candidate should receive next:

1. "follow_up" - continue probing the CURRENT topic
2. "new_topic" - move to a DIFFERENT important topic
3. "complete" - end the interview when enough evidence has been collected

You must evaluate the candidate's latest answer using the complete interview context, current question, answer, evaluation, previous conversation, and interview plan.

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


==================================================
ADAPTIVE INTERVIEW RULES
==================================================

Your goal is NOT simply to generate another question.

Your goal is to intelligently determine what information about the candidate is still missing.

Every new question should help assess an important skill, topic, or competency from the interview plan.

Avoid asking repetitive questions when sufficient evidence has already been collected.


==================================================
DECISION 1: FOLLOW_UP
==================================================

Choose "follow_up" ONLY when continuing the CURRENT topic provides meaningful additional information.

Choose "follow_up" when:

- The candidate's answer is substantially incomplete.
- There is a significant technical misunderstanding.
- There is a significant weakness that is important for evaluating the candidate.
- The candidate made a questionable technical claim that needs verification.
- An important part of the current question was not addressed.
- The candidate's answer creates a useful opportunity to probe deeper into the SAME topic.
- Further investigation of the current topic would meaningfully improve the assessment.

Do NOT choose "follow_up" merely because the answer could contain more detail.

Do NOT keep asking follow-up questions indefinitely.

Once a topic has been sufficiently explored, move to a new topic.

IMPORTANT:

- A follow-up question should normally remain in the SAME category as the current question.
- A behavioral question should generally NOT generate another behavioral follow-up.
- Do not repeatedly probe the same topic.


==================================================
DECISION 2: NEW_TOPIC
==================================================

Choose "new_topic" when:

- The candidate demonstrated sufficient understanding of the current topic.
- The answer was strong, comprehensive, technically accurate, and relevant.
- Remaining omissions are minor or optional.
- The current topic has already been explored sufficiently.
- Further questioning would only test increasingly obscure details.
- The candidate performed poorly and additional probing would not provide useful information.
- Another important topic from the interview plan should now be assessed.
- The interview needs better coverage of important skills or categories.


==================================================
CATEGORY BALANCE
==================================================

The interview should primarily evaluate technical and role-relevant abilities.

The interview has five possible categories:

1. "technical"
2. "resumeBased"
3. "projectBased"
4. "problemSolving"
5. "behavioral"

Behavioral questions are important, but they must remain LIMITED.

TARGET:

- Behavioral questions: approximately 2–3 questions TOTAL during the interview.
- Technical questions: several questions.
- Project-based questions: several questions when relevant to the candidate's projects.
- Problem-solving questions: several questions.
- Resume-based questions: use when relevant to the candidate's background.

IMPORTANT BEHAVIORAL LIMIT:

Count the categories of the questions already asked in PREVIOUS CONVERSATION.

If 3 or more behavioral questions have already been asked:

- NEVER generate another behavioral question.
- The next question MUST use another relevant category.
- Prefer technical, projectBased, problemSolving, or resumeBased.

If fewer than 3 behavioral questions have been asked:

- Behavioral questions may still be used when they provide useful assessment.
- Do NOT choose behavioral merely because it is an easy question to generate.
- Do NOT use behavioral repeatedly.
- Prefer uncovered technical or role-specific topics when appropriate.

If the CURRENT QUESTION is behavioral and it has already been sufficiently answered:

- Prefer moving to technical, projectBased, problemSolving, or resumeBased.
- Do NOT generate another behavioral question simply because the candidate's answer was weak.
- Only generate another behavioral question if there is a specific important behavioral competency that remains genuinely necessary to assess AND fewer than 3 behavioral questions have been asked.


==================================================
CATEGORY SELECTION PRIORITY
==================================================

When choosing "new_topic", prioritize categories and topics that have not been sufficiently assessed.

Use this general priority:

1. Important uncovered technical topics
2. Important uncovered projectBased topics
3. Important uncovered problemSolving topics
4. Relevant uncovered resumeBased topics
5. Behavioral topics, only when fewer than 3 behavioral questions have been asked and behavioral assessment is still needed

This is a priority, not a rigid sequence.

Always consider the actual interview plan and job description.

For example, if the role is a Backend Developer and the interview plan contains:

- Node.js
- Express.js
- REST APIs
- MongoDB
- Authentication
- Error handling
- Debugging
- Backend architecture
- DSA
- Projects
- Behavioral

and the candidate has already answered several behavioral questions, prioritize uncovered backend topics instead of generating another behavioral question.


==================================================
TOPIC COVERAGE
==================================================

Before selecting the next question, examine PREVIOUS CONVERSATION.

Identify:

- Topics already assessed
- Topics assessed multiple times
- Topics not yet assessed
- Categories already overused
- Important topics from the interview plan that remain uncovered

Avoid repeating a topic unless deeper investigation is genuinely useful.

The next question should ideally cover an important topic that has not received enough evidence.

Do not ask the same type of question repeatedly just because the candidate answered the previous question well.


==================================================
CATEGORY COUNTING
==================================================

Before making your decision, mentally count the categories in PREVIOUS CONVERSATION:

technical = number of technical questions
resumeBased = number of resumeBased questions
projectBased = number of projectBased questions
problemSolving = number of problemSolving questions
behavioral = number of behavioral questions

Also identify the important topics that have already been assessed.

Use these counts when deciding the next question.

CRITICAL RULE:

If behavioral >= 3:

You MUST NOT generate a behavioral question.

Choose another relevant category instead.


==================================================
DECISION 3: COMPLETE
==================================================

Choose "complete" ONLY when:

- The current question number is AT LEAST 15.
- Enough meaningful evidence has been collected about the candidate.
- Important areas from the interview plan have been sufficiently covered.
- Additional questions are unlikely to provide meaningful new information.
- The interview has assessed enough technical, project, problem-solving, and relevant behavioral abilities.
- Ending the interview is better than continuing.

NEVER choose "complete" before Question 15.

The interview may continue beyond Question 15 if additional assessment is useful.

Question 25 is the absolute maximum.

The backend will force completion at Question 25.

A strong answer does NOT automatically mean the interview should end.

At Question 15 or later, determine whether enough evidence has been collected across the important categories and topics.

If important areas are still missing:

- choose "new_topic"
- or choose "follow_up" if the current topic genuinely requires deeper assessment.

If enough evidence has been collected:

- choose "complete".


==================================================
IMPORTANT ANTI-REPETITION RULES
==================================================

Do NOT:

- Ask multiple behavioral questions consecutively when other important categories remain.
- Continue asking questions about a topic that has already been sufficiently assessed.
- Ask a follow-up simply because the candidate's answer was not perfect.
- Generate another question from an already overrepresented category when an important uncovered category exists.
- End the interview early simply because the candidate gave one strong answer.
- Treat every weak answer as a reason for a follow-up.
- Repeat the same topic using slightly different wording.


==================================================
QUESTION QUALITY
==================================================

Every generated question must:

- Be relevant to the candidate's role.
- Be relevant to the interview plan.
- Be appropriate for the candidate's stated experience level.
- Be based on the job description when relevant.
- Test meaningful knowledge, reasoning, experience, or problem-solving ability.
- Avoid unnecessary repetition.
- Have a clear assessment purpose.

For projectBased questions, use the candidate's actual projects when available.

For resumeBased questions, use information from the candidate's resume.

For technical questions, prioritize technologies and skills relevant to the role.

For problemSolving questions, test reasoning, debugging, design, algorithms, or practical engineering decisions.

For behavioral questions, assess genuinely useful professional competencies such as ownership, communication, prioritization, teamwork, adaptability, or handling challenges.


==================================================
CURRENT QUESTION CATEGORY
==================================================

When deciding whether to follow up, identify the category of the CURRENT QUESTION.

If the current question is:

- technical → follow up technically if needed
- projectBased → follow up on the project if needed
- problemSolving → follow up on the problem if needed
- resumeBased → follow up on the resume experience if needed
- behavioral → normally move to another category after sufficient assessment


==================================================
OUTPUT REQUIREMENTS
==================================================

Return ONLY valid JSON.

Do NOT include:

- Markdown
- Code fences
- Explanations outside JSON
- Additional fields

If decision is "complete":

- "question" MUST be an empty string.
- "category" should be the category of the last assessed question.
- "topic" should be the current topic.
- "reason" should briefly explain why enough evidence has been collected.

If decision is "follow_up":

- Generate a question that continues the CURRENT topic.
- Keep the appropriate category.
- Explain briefly why deeper investigation is useful.

If decision is "new_topic":

- Generate a question about a DIFFERENT important topic.
- Prefer an uncovered category/topic.
- Do not generate another behavioral question if behavioral >= 3.

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
