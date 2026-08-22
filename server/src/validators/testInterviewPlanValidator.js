const {interviewPlanSchema} = require("./interviewPlan.validator");
const validPlan = {
  interviewStrategy: {
    primaryFocus: "technical",
    questionRange: {
      minimum: 15,
      maximum: 25,
    },
  },

  technical: {
    priority: "high",
    topics: ["JavaScript"],
    targetDepth: "deep",
  },

  resumeBased: {
    priority: "medium",
    areas: ["TypeScript"],
    targetDepth: "moderate",
  },

  projectBased: {
    priority: "high",
    projects: [
      {
        name: "Test Project",
        technologies: ["Node.js"],
        areasToProbe: ["Architecture"],
        targetDepth: "deep",
      },
    ],
  },

  problemSolving: {
    priority: "high",
    areas: ["API design"],
    difficulty: "medium",
  },

  behavioral: {
    priority: "medium",
    competencies: ["Communication"],
    scenarioTypes: ["Deadline pressure"],
  },
};

try {
  const result = interviewPlanSchema.parse(validPlan);

  console.log("✅ Valid plan passed Zod validation");
  console.log(result);
} catch (error) {
  console.error("❌ Validation failed");
  console.error(error);
}

const invalidPlan = {
  ...validPlan,
 
  technical : {
    ...validPlan.technical,
    priority : "banana"
  },
};

try{
  interviewPlanSchema.parse(invalidPlan);

  console.log("❌ Invalid plan unexpectedly passed");

}
catch(error) {
  console.log("✅ Invalid plan was correctly rejected by Zod");
}