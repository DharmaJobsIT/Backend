import express from "express";
import {
  createJob,
  getPublicJobs,
  getHomeJobs,
  getRecommendedJobs,
  getJobDetails,
  getSimilarJobs,
  updateJob,
  deactivateJob,
  activateJob,
  deleteJob,
} from "./job.controller.js";
import {
  protect,
  authorize,
  optionalProtect,
} from "../../middleware/auth.middleware.js";
import { attachRecruiter } from "../../middleware/attachRecruiter.js";
import { requireVerifiedRecruiter } from "../../middleware/requireVerifiedRecruiter.js";

const router = express.Router();

router.get("/", optionalProtect, getPublicJobs);
router.get("/home", getHomeJobs);
router.get("/recommended", protect, authorize("jobseeker"), getRecommendedJobs);
router.get("/:jobId/similar", getSimilarJobs);
router.get("/:jobId", getJobDetails);

router.post(
  "/",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  createJob,
);

router.put(
  "/:jobId",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  updateJob,
);

router.patch(
  "/:jobId/deactivate",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  deactivateJob,
);
router.patch(
  "/:jobId/activate",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  activateJob,
);

router.delete(
  "/:jobId",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  deleteJob,
);
// router.get(
//   "/recruiter/my-jobs",
//   protect,
//   authorize("recruiter"),
//   requireVerifiedRecruiter,
//   getRecruiterJobs
// );

export default router;
