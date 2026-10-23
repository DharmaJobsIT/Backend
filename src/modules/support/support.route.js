
import { Router } from "express";
import rateLimit from "express-rate-limit";
import { optionalProtect } from "../../middleware/auth.middleware.js";
import { chatWithSupport } from "./support.controller.js";

const router = Router();

const supportChatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    message: "Too many support requests. Please try again later.",
  },
});

router.post(
  "/chat",
  supportChatLimiter,
  optionalProtect,
  chatWithSupport
);

export default router;
