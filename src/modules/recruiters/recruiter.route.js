import express from "express";
import { registerRecruiter, getAllRecruiters, verifyRecruiter,getRecruiterDashboardStats, getApplicationsPerJob,getApplicationTrend, getJobPerformance, upgradePlan, getResumeDownloadLink, submitRecruiterProfile, getMyRecruiter, 
 getMyJobs ,updateRecruiterProfile, changePassword, getJobSummary, } from "./recruiter.controller.js";
import { protect, authorize, requireVerifiedRecruiter } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerRecruiter);
router.post('/profile',protect,authorize('recruiter'),submitRecruiterProfile);
router.get(
  "/me",
  protect,
  authorize("recruiter"),
  getMyRecruiter
);

//protected routes for admin
router.get("/", protect, authorize("admin"), getAllRecruiters);
router.patch("/:id/verify", protect, authorize("admin"), verifyRecruiter);

router.get(
  "/dashboard",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  getRecruiterDashboardStats
);
router.get(
  "/analytics/applications-per-job",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  getApplicationsPerJob
);

router.get(
  "/analytics/trend",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  getApplicationTrend
);

router.get(
  "/analytics/performance",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  getJobPerformance
);

router.patch(
  "/upgrade-plan",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  upgradePlan
);

router.get(
  "/applications/:applicationId/resume",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  getResumeDownloadLink
)

router.put(
  "/profile/update",
  protect,
  authorize("recruiter"),
  updateRecruiterProfile
);
router.put(
  "/change-password",
  protect,
  authorize("recruiter"),
  changePassword
);

router.get(
  "/my-jobs",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  getMyJobs
);
router.get(
  "/job-summary",
  protect,
  authorize("recruiter"),
  requireVerifiedRecruiter,
  getJobSummary
);
// router.get(
//   "/jobs/:jobId/applications",
//   protect,
//   authorize("recruiter"),
//   requireVerifiedRecruiter,
//   getApplicationsForMyJob
// );

export default router;