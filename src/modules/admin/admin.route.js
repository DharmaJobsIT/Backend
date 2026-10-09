import express from "express";
import {
  getAllRecruiters,
  verifyRecruiter,
  blockRecruiter,
  getAllJobs,
  getAllApplications,
  markRecruiterUnderReview,
  rejectRecruiter,
} from "./admin.controller.js";

import { protect, authorize } from "../../middleware/auth.middleware.js";

const router = express.Router();

/**
 * Protect all admin routes
 */
router.use(protect, authorize("admin"));

router.get("/recruiters", getAllRecruiters);
router.patch("/recruiters/:id/verify", verifyRecruiter);
router.patch("/recruiters/:id/review", markRecruiterUnderReview);
router.patch("/recruiters/:id/reject", rejectRecruiter);
router.patch("/recruiters/:id/block", blockRecruiter);

router.get("/jobs", getAllJobs);
router.get("/applications", getAllApplications);

export default router;
