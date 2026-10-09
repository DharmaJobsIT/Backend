import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
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
  },
  {
    timestamps: true,
  },
);

// Prevent saving the same job twice
savedJobSchema.index(
  {
    job: 1,
    jobSeeker: 1,
  },
  {
    unique: true,
  },
);

export const SavedJob = mongoose.model(
  "SavedJob",
  savedJobSchema,
);