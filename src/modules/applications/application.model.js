import mongoose from "mongoose";

const applicationSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    jobSeeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: true,
    },
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
    },
    status: {
      type: String,
      enum: [
        "applied",
        "under_review",
        "shortlisted",
        "interview_scheduled",
        "selected",
        "rejected",
        "withdrawn",
      ],
      default: "applied",
    },
    recruiterActivity: {
      viewedAt: Date,
      proceededAt: Date,

      lastContactedAt: Date,

      contactHistory: [
        {
          method: {
            type: String,
            enum: ["email", "mobile"],
          },
          initiatedAt: {
            type: Date,
            default: Date.now,
          },
        },
      ],
    },
    matchScore: {
      type: Number,
      min: 0,
      max: 100,
    },
    matchBreakdown: {
      qualification: Number,
      experience: Number,
      jobTitle: Number,
      salary: Number,
      location: Number,
    },
    applicantSnapshot: {
      fullName: {
        type: String,
        trim: true,
      },

      phone: {
        type: String,
        trim: true,
      },

      email: {
        type: String,
        trim: true,
      },

      district: {
        type: String,
        trim: true,
      },

      highestQualification: {
        type: String,
        trim: true,
      },

      experienceYears: {
        type: Number,
        default: 0,
      },

      experience: [
        {
          organization: {
            type: String,
            trim: true,
          },

          designation: {
            type: String,
            trim: true,
          },

          startDate: Date,

          endDate: Date,

          currentlyWorking: Boolean,
        },
      ],

      currentSalary: {
        type: Number,
        default: null,
      },

      expectedSalary: {
        type: Number,
        default: null,
      },

      skills: [
        {
          type: String,
          trim: true,
        },
      ],

      resumeUrl: {
        type: String,
        trim: true,
      },
    },
    applicationQuestions: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
        },

        question: {
          type: String,
          required: true,
          trim: true,
        },

        type: {
          type: String,
          required: true,
          enum: [
            "text",
            "textarea",
            "number",
            "single_choice",
            "multiple_choice",
            "yes_no",
          ],
        },

        options: [
          {
            type: String,
            trim: true,
          },
        ],

        required: {
          type: Boolean,
          default: false,
        },

        answer: {
          type: mongoose.Schema.Types.Mixed,
        },
      },
    ],
  },
  { timestamps: true },
);

applicationSchema.index({ job: 1, jobSeeker: 1 }, { unique: true });

export const Application = mongoose.model("Application", applicationSchema);
