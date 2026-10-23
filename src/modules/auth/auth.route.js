import express from "express";
import {
  adminLogin,
  loginUser,
  sendOTP,
  verifyOTPAndRegister,
  googleLoginCallback,
  exchangeGoogleCode,
  forgotPassword,
  resetPassword,
} from "./auth.controller.js";
import passport from "passport";

const router = express.Router();

router.post("/admin/login", adminLogin);
router.post("/login", loginUser);
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"] }),
);

/*
|--------------------------------------------------------------------------
| Google OAuth - Job Seeker
|--------------------------------------------------------------------------
*/

router.get(
  "/google/jobseeker",
  passport.authenticate("google-jobseeker", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/jobseeker/callback",
  passport.authenticate("google-jobseeker", {
    session: false,
  }),
  googleLoginCallback,
);

/*
|--------------------------------------------------------------------------
| Google OAuth - Recruiter
|--------------------------------------------------------------------------
*/

router.get(
  "/google/recruiter",
  passport.authenticate("google-recruiter", {
    scope: ["profile", "email"],
  }),
);

router.get(
  "/google/recruiter/callback",
  passport.authenticate("google-recruiter", {
    session: false,
  }),
  googleLoginCallback,
);

router.post("/google/exchange", exchangeGoogleCode);

router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);

router.post("/send-otp", sendOTP);
router.post("/verify-otp", verifyOTPAndRegister);

export default router;
