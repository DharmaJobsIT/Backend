import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      minlength: 6,
      required: function () {
        return this.provider === "local";
      },
      select: false,
    },
    role: {
      type: String,
      enum: ["admin", "recruiter", "jobseeker"],
      default: "jobseeker",
    },
    provider: {
      type: String,
      enum: ["local", "google"],
      default: "local",
    },
    googleId: String,

    passwordResetToken: {
      type: String,
      select: false,
    },
    passwordResetExpires: {
      type: Date,
      select: false,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true },
);

export const User = mongoose.model("User", userSchema);
