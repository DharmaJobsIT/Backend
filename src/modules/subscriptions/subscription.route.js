import express from "express";

import { createSubscriptionOrder, verifySubscriptionPayment } from "./subscription.controller.js";

import { protect, authorize } from "../../middleware/auth.middleware.js";
import { attachRecruiter } from "../../middleware/attachRecruiter.js";

const router = express.Router();

router.post(
  "/create-order",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  createSubscriptionOrder,
);

router.post(
  "/verify-payment",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  verifySubscriptionPayment,
);

export default router;