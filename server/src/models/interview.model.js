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

    evaluation: {
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

    weaknesses: {
      type: [String],
      default: [],
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

    role: {
      type: String,
      required: true,
      trim: true,
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

const Interview = mongoose.model("Interview", interviewSchema);

module.exports = Interview;
