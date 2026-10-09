import mongoose from "mongoose";

const jobSearchSchema = new mongoose.Schema(
  {
    jobSeeker: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "JobSeeker",
      required: true,
    },

    keyword: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
    },

    searchCount: {
      type: Number,
      default: 1,
    },

    lastSearchedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

jobSearchSchema.index(
  {
    jobSeeker: 1,
    keyword: 1,
  },
  {
    unique: true,
  },
);

export const JobSearch = mongoose.model(
  "JobSearch",
  jobSearchSchema,
);