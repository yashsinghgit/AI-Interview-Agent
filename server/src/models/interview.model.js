const mongoose = require("mongoose");

const conversationSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: true,
    },

    answer: {
      type: String,
      default: "",
    },

    phase: {
      type: String,
      enum: ["warmup", "resume", "technical", "problem_solving", "behavioral"],
      default: "warmup",
    },

    is_followup: {
      type: Boolean,
      default: false,
    },

    based_on: {
      type: String,
      default: "",
    },

    transition: {
      type: String,
      default: null,
    },

    // Evaluation fields (written to the user as "you")
    headline: {
      type: String,
      default: "",
    },

    score: {
      type: Number,
      default: null,
    },

    strengths: {
      type: [String],
      default: [],
    },

    improvements: {
      type: [String],
      default: [],
    },

    subscores: {
      structure: { type: Number, default: null },
      depth: { type: Number, default: null },
      impact: { type: Number, default: null },
      relevance: { type: Number, default: null },
    },

    stronger_answer: {
      type: String,
      default: "",
    },

    enough_signal: {
      type: Boolean,
      default: false,
    },

    reason: {
      type: String,
      default: "",
    },

    evaluation: {
      type: String,
      default: "",
    },

    weaknesses: {
      type: [String],
      default: [],
    },

    status: {
      type: String,
      enum: ["unanswered", "evaluating", "answered"],
      default: "unanswered",
    },

    category: {
      type: String,
      default: "technical",
    },

    topic: {
      type: String,
      default: "",
    },

    decision: {
      type: String,
      default: "",
    },
  },
  {
    _id: true,
  },
);

const interviewSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    role: {
      type: String,
      required: true,
      trim: true,
    },

    mode: {
      type: String,
      enum: ["practice", "mock"],
      default: "practice",
    },

    currentPhase: {
      type: String,
      enum: ["warmup", "resume", "technical", "problem_solving", "behavioral"],
      default: "warmup",
    },

    greeting: {
      type: String,
      default: null,
    },

    difficulty: {
      type: String,
      enum: ["easy", "medium", "hard"],
      required: true,
    },

    jobDescription: {
      type: String,
      default: "",
    },

    resumeText: {
      type: String,
      default: "",
    },

    interviewPlan: {
      interviewStrategy: {
        primaryFocus: {
          type: String,
        },

        questionRange: {
          minimum: {
            type: Number,
          },

          maximum: {
            type: Number,
          },
        },
      },

      technical: {
        priority: {
          type: String,
        },

        topics: {
          type: [String],
          default: [],
        },

        targetDepth: {
          type: String,
        },
      },

      resumeBased: {
        priority: {
          type: String,
        },

        areas: {
          type: [String],
          default: [],
        },

        targetDepth: {
          type: String,
        },
      },

      projectBased: {
        priority: {
          type: String,
        },

        projects: [
          {
            name: {
              type: String,
            },

            technologies: {
              type: [String],
              default: [],
            },

            areasToProbe: {
              type: [String],
              default: [],
            },

            targetDepth: {
              type: String,
            },
          },
        ],
      },

      problemSolving: {
        priority: {
          type: String,
        },

        areas: {
          type: [String],
          default: [],
        },

        difficulty: {
          type: String,
        },
      },

      behavioral: {
        priority: {
          type: String,
        },

        competencies: {
          type: [String],
          default: [],
        },

        scenarioTypes: {
          type: [String],
          default: [],
        },
      },
    },

    conversation: {
      type: [conversationSchema],
      default: [],
    },

    currentQuestion: {
      type: Number,
      default: 0,
    },

    followUpCount: {
      type: Number,
      default: 0,
    },

    status: {
      type: String,
      enum: ["in-progress", "completed"],
      default: "in-progress",
    },

    durationMinutes: {
      type: Number,
      default: 20,
    },

    expiresAt: {
      type: Date,
      default: null,
    },

    questionLock: {
      token: {
        type: String,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },

    answerLock: {
      token: {
        type: String,
        default: null,
      },
      questionId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
      },
      expiresAt: {
        type: Date,
        default: null,
      },
    },

    finalReport: {
      overallScore: {
        type: Number,
        default: null,
      },

      strengths: {
        type: [String],
        default: [],
      },

      weaknesses: {
        type: [String],
        default: [],
      },

      recommendations: {
        type: [String],
        default: [],
      },
    },
  },
  {
    timestamps: true,
  },
);

// Compound index for user interview history queries (Equality: user, Sort: createdAt DESC, _id DESC)
interviewSchema.index({ user: 1, createdAt: -1, _id: -1 });

// Compound index for user status filtering & count aggregation
interviewSchema.index({ user: 1, status: 1 });

const Interview = mongoose.model("Interview", interviewSchema);

module.exports = Interview;
