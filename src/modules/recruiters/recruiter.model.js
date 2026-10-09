import mongoose from "mongoose";

const recruiterSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
    instituteName: String,
    district: String,
    contactPhone: {
      type: String,
      trim: true,
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    subscriptionPlan: {
      type: String,
      enum: ["free_trial", "basic", "pro"],
      default: "free_trial",
    },
    planStartDate: Date,
    planExpiryDate: Date,
    trialUsed: {
      type: Boolean,
      default: false,
    },
    jobPostLimit: {
      type: Number,
      default: 1,
    },
    verificationStatus: {
      type: String,
      enum: ["submitted", "under_review", "verified", "rejected"],
      default: "submitted",
    },
    verificationTimeline: [
      {
        status: String,
        date: Date,
      },
    ],
    rejectionReason: String,
    jobsPosted: {
      type: Number,
      default: 0,
    },
  },
  { timestamps: true },
);

export const Recruiter = mongoose.model("Recruiter", recruiterSchema);
