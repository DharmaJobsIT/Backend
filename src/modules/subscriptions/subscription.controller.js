import Razorpay from "razorpay";
import { Subscription } from "./subscription.model.js";
import crypto from "crypto";
import { Recruiter } from "../recruiters/recruiter.model.js";

const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

const PLANS = {
  basic: {
    monthly: 69900,
    quarterly: 199900,
  },
  pro: {
    monthly: 109900,
    quarterly: 299900,
  },
};

const calculateGatewayFee = (baseAmount) => {
  const feePercent = Number(process.env.RAZORPAY_FEE_PERCENT || 2);

  const gstPercent = Number(process.env.RAZORPAY_FEE_GST_PERCENT || 18);

  const effectiveFeeRate = (feePercent / 100) * (1 + gstPercent / 100);

  // Gross-up so the base plan amount remains
  // after the gateway fee is deducted.
  const totalAmount = Math.ceil(baseAmount / (1 - effectiveFeeRate));

  const gatewayFeeAmount = totalAmount - baseAmount;

  return {
    gatewayFeeAmount,
    totalAmount,
    effectiveFeeRate,
  };
};

export const createSubscriptionOrder = async (req, res) => {
  try {
    const { plan, billingCycle } = req.body;

    if (!plan || !billingCycle) {
      return res.status(400).json({
        message: "Plan and billing cycle are required",
      });
    }

    if (!PLANS[plan]) {
      return res.status(400).json({
        message: "Invalid plan",
      });
    }

    if (!PLANS[plan][billingCycle]) {
      return res.status(400).json({
        message: "Invalid billing cycle",
      });
    }

    const baseAmount = PLANS[plan][billingCycle];

    const { gatewayFeeAmount, totalAmount } = calculateGatewayFee(baseAmount);

    if (totalAmount < 100) {
      return res.status(400).json({
        message: "Invalid payment amount",
      });
    }

    const recruiterId = req.recruiter?._id;

    if (!recruiterId) {
      return res.status(401).json({
        message: "Recruiter authentication required",
      });
    }

    const receipt = `sub_${recruiterId}_${Date.now()}`;

    const order = await razorpay.orders.create({
      amount: totalAmount,
      currency: "INR",
      receipt,
    });

    const subscription = await Subscription.create({
      recruiter: recruiterId,
      plan,
      billingCycle,

      baseAmount,
      gatewayFeeAmount,
      amount: totalAmount,

      currency: "INR",
      razorpayOrderId: order.id,
      status: "created",
    });

    return res.status(201).json({
      message: "Subscription order created successfully",

      orderId: order.id,

      baseAmount,
      gatewayFeeAmount,
      amount: order.amount,

      currency: order.currency,

      subscriptionId: subscription._id,
    });
  } catch (error) {
    console.error("Create subscription order error:", error);

    if (error?.statusCode === 401) {
      return res.status(401).json({
        message: "Razorpay authentication failed",
      });
    }

    return res.status(500).json({
      message: "Failed to create subscription order",
    });
  }
};

export const verifySubscriptionPayment = async (req, res) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } =
      req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        message: "Payment verification details are required",
      });
    }

    const subscription = await Subscription.findOne({
      razorpayOrderId: razorpay_order_id,
      recruiter: req.recruiter._id,
    });

    if (!subscription) {
      return res.status(404).json({
        message: "Subscription order not found",
      });
    }

    if (subscription.status === "paid") {
      return res.status(400).json({
        message: "Subscription payment already verified",
      });
    }

    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Invalid payment signature",
      });
    }

    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;
    subscription.status = "paid";
    // subscription.startDate = new Date();
    // subscription.endDate = new Date();
    const planLimits = {
      basic: 10,
      pro: 50,
    };

    const startDate = new Date();
    const endDate = new Date(startDate);

    if (subscription.billingCycle === "monthly") {
      endDate.setMonth(endDate.getMonth() + 1);
    } else {
      endDate.setMonth(endDate.getMonth() + 3);
    }

    subscription.razorpayPaymentId = razorpay_payment_id;
    subscription.razorpaySignature = razorpay_signature;
    subscription.status = "paid";
    subscription.startDate = startDate;
    subscription.endDate = endDate;

    await subscription.save();

    const recruiter = await Recruiter.findById(subscription.recruiter);

    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter profile not found",
      });
    }

    recruiter.subscriptionPlan = subscription.plan;
    recruiter.jobPostLimit = planLimits[subscription.plan];
    recruiter.planStartDate = startDate;
    recruiter.planExpiryDate = endDate;

    await recruiter.save();
    return res.status(200).json({
      message: "Payment verified successfully",
      subscriptionId: subscription._id,
      status: subscription.status,
    });
  } catch (error) {
    console.error("Verify subscription payment error:", error);

    return res.status(500).json({
      message: "Failed to verify subscription payment",
    });
  }
};
