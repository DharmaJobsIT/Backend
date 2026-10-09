import mongoose from "mongoose";

const jobSeekerSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    fullName: String,
    highestQualification: String,
    experienceYears: {
      type: Number,
      default: 0,
    },
    experience: [
      {
        organization: String,
        designation: String,
        startDate: Date,
        endDate: Date,
        currentlyWorking: Boolean,
      },
    ],
    phone: {
      type: String,
      trim: true,
    },
    dateOfBirth: Date,
    gender: {
      type: String,
      enum: ["Male", "Female", "Other"],
    },
    subjects: [String],
    preferredCategories: [
      {
        type: String,
        enum: ["Teaching", "Non Teaching", "Management", "Support Staff"],
      },
    ],
    preferredDistricts: [String],
    expectedSalary: {
      type: Number,
      default: null,
    },
    about: String,
    skills: [String],
    profilePhoto: String,
    district: String,
    resumeUrl: {
      type: String,
    },
    resumeFileName: String,
    resumeUpdatedAt: {
      type: Date,
    },
    jobStatus: {
      type: String,
      enum: ["Actively Looking", "Open to Opportunities", "Not Looking"],
      default: "Actively Looking",
    },
    profileCompleted: {
      type: Boolean,
      default: false,
    },
    currentSalary: {
      type: Number,
      default: null,
    },
    lastActive: Date,
  },
  { timestamps: true },
);

export const JobSeeker = mongoose.model("JobSeeker", jobSeekerSchema);
