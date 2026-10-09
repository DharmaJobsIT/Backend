import mongoose from "mongoose";
import { createHash } from "crypto";

const jobSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: true,
    },

    subject: {
      type: String,
      required: true,
    },

    positionLevel: {
      type: String,
      default: "Lecturer",
      required: true,
      enum: [
        "Assistant Teacher",
        "Senior Teacher",
        "Lecturer",
        "Senior Lecturer",
        "Head of Department",
        "Principal",
        "Technician",
        "Helper",
      ],
    },

    category: {
      type: String,
      default: "Teaching",
      enum: ["Teaching", "Non Teaching", "Management", "Support Staff"],
      // required: true,
    },

    district: {
      type: String,
      required: true,
    },

    salaryRange: {
      type: String,
      default: "",
    },
    salaryMin: {
      type: Number,
    },

    salaryMax: {
      type: Number,
    },

    salaryType: {
      type: String,
      enum: ["fixed", "range"],
      default: "fixed",
    },

    experienceRequired: {
      type: String,
      default: "",
    },

    experienceType: {
      type: String,
      enum: ["fixed", "range"],
      default: "fixed",
    },
    experienceMin: {
      type: Number,
    },

    experienceMax: {
      type: Number,
    },

    qualification: {
      type: String,
    },

    instituteName: {
      type: String,
    },

    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
    },

    jobHash: {
      type: String,
    },

    expiryDate: {
      type: Date,
    },

    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
    },
    promotion: {
      isBoosted: {
        type: Boolean,
        default: false,
      },

      priority: {
        type: Number,
        default: 0,
      },

      boostedAt: Date,

      boostExpiresAt: Date,
    },
    // isActive: {
    //   type: Boolean,
    //   default: true,
    // },
  },
  { timestamps: true },
);
jobSchema.pre("save", function () {
  if (
    !this.isModified("recruiter") &&
    !this.isModified("subject") &&
    !this.isModified("positionLevel") &&
    !this.isModified("district")
  ) {
    return;
  }

  const rawString = `${this.recruiter}${this.subject}${this.positionLevel}${this.district}`;

  this.jobHash = createHash("sha256").update(rawString).digest("hex");
});
jobSchema.index({ district: 1 });
jobSchema.index({ subject: 1 });
jobSchema.index({ createdAt: -1 });
jobSchema.index({ experienceRequired: 1 });
jobSchema.index({ qualification: 1 });
jobSchema.index({ jobHash: 1 });
jobSchema.index({
  title: "text",
  subject: "text",
  instituteName: "text",
  qualification: "text",
});

export const Job = mongoose.model("Job", jobSchema);
