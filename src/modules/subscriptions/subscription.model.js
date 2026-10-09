import mongoose from "mongoose";

const subscriptionSchema = new mongoose.Schema(
  {
    recruiter: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Recruiter",
      required: true,
      index: true,
    },

    plan: {
      type: String,
      enum: ["basic", "pro"],
      required: true,
    },

    billingCycle: {
      type: String,
      enum: ["monthly", "quarterly"],
      required: true,
    },

    // Amount stored in paise
    baseAmount: {
      type: Number,
      required: true,
    },

    gatewayFeeAmount: {
      type: Number,
      required: true,
    },

    amount: {
      type: Number,
      required: true,
    },

    currency: {
      type: String,
      default: "INR",
    },

    razorpayOrderId: {
      type: String,
      required: true,
      unique: true,
    },

    razorpayPaymentId: {
      type: String,
      sparse: true,
    },

    razorpaySignature: {
      type: String,
    },

    status: {
      type: String,
      enum: ["created", "pending", "paid", "failed", "expired", "cancelled"],
      default: "created",
    },

    startDate: {
      type: Date,
    },

    endDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  },
);

/*
 * Indexes
 */

// Recruiter's subscription history
subscriptionSchema.index({ recruiter: 1, createdAt: -1 });

// Quickly find active/paid subscriptions for a recruiter
subscriptionSchema.index({
  recruiter: 1,
  status: 1,
  endDate: -1,
});

// Useful for payment verification / webhook lookups
subscriptionSchema.index({ razorpayPaymentId: 1 }, { sparse: true });

export const Subscription = mongoose.model("Subscription", subscriptionSchema);
