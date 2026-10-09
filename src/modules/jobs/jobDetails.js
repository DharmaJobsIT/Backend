import mongoose from "mongoose";

const jobDetailsSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
      unique: true,
      index: true,
    },

    // Job Overview
    jobPurpose: {
      type: String,
      default: "",
      trim: true,
    },

    // Responsibilities
    duties: [
      {
        title: {
          type: String,
          trim: true,
        },
        description: {
          type: String,
          trim: true,
        },
      },
    ],

    // Decision Making
    keyDecisions: [
      {
        type: String,
        trim: true,
      },
    ],

    // Challenges
    majorChallenges: [
      {
        type: String,
        trim: true,
      },
    ],

    // Required Skills
    skills: [
      {
        type: String,
        trim: true,
      },
    ],

    // Employment Information
    employmentType: {
      type: String,
      default: "Full Time",
      enum: ["Full Time", "Part Time", "Contract", "Internship", "Temporary"],
    },

    department: {
      type: String,
      default: "",
      trim: true,
    },

    roleCategory: {
      type: String,
      default: "",
      trim: true,
    },

    industryType: {
      type: String,
      default: "",
      trim: true,
    },

    // Education
    education: {
      ug: [
        {
          type: String,
          trim: true,
        },
      ],

      pg: [
        {
          type: String,
          trim: true,
        },
      ],

      professional: [
        {
          type: String,
          trim: true,
        },
      ],
    },

    // Application Questions
    applicationQuestions: [
      {
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
      },
    ],

    // Additional Information
    additionalInformation: {
      type: String,
      default: "",
      trim: true,
    },
  },
  {
    timestamps: true,
  },
);

export const JobDetails = mongoose.model("JobDetails", jobDetailsSchema);
