import express from "express";

import {
  getApplyForm,
  applyToJob,
  getRecruiterApplications,
  getRecruiterApplication,
  getJobSeekerApplications,
  getJobApplicationStatus,
  proceedWithApplication,
  contactApplicant,
  updateApplicationStatus,
} from "./application.controller.js";

import {
  protect,
  authorize,
  requireVerifiedRecruiter,
} from "../../middleware/auth.middleware.js";

import { attachRecruiter } from "../../middleware/attachRecruiter.js";

const router = express.Router();

// ==========================================================
// JOB SEEKER
// ==========================================================

router.get("/my", protect, authorize("jobseeker"), getJobSeekerApplications);

router.get(
  "/:jobId/status",
  protect,
  authorize("jobseeker"),
  getJobApplicationStatus,
);

router.get("/:jobId/apply-form", protect, getApplyForm);

router.post("/:jobId", protect, applyToJob);

// ==========================================================
// RECRUITER — APPLICATIONS LIST
// ==========================================================

router.get(
  "/applications/:jobId",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  getRecruiterApplications,
);

// ==========================================================
// RECRUITER — SINGLE APPLICATION
// ==========================================================

router.get(
  "/detail/:applicationId",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  getRecruiterApplication,
);

// ==========================================================
// RECRUITER — PROCEED
// ==========================================================

router.patch(
  "/:applicationId/proceed",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  proceedWithApplication,
);

// ==========================================================
// RECRUITER — CONTACT APPLICANT
// ==========================================================

router.patch(
  "/:applicationId/contact",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  contactApplicant,
);

// ==========================================================
// RECRUITER — UPDATE APPLICATION STATUS
// ==========================================================

router.patch(
  "/:applicationId/status",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  updateApplicationStatus,
);

export default router;
