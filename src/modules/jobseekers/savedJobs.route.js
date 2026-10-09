import express from "express";

import {
  saveJob,
  removeSavedJob,
  getSavedJobs,
  getSavedJobStatus,
} from "./savedJob.controller.js";

import {
  protect,
  authorize,
} from "../../middleware/auth.middleware.js";

const router = express.Router();

// Get all saved jobs
router.get(
  "/",
  protect,
  authorize("jobseeker"),
  getSavedJobs
);

// Check whether a specific job is saved
router.get(
  "/status/:jobId",
  protect,
  authorize("jobseeker"),
  getSavedJobStatus
);

// Save a job
router.post(
  "/:jobId",
  protect,
  authorize("jobseeker"),
  saveJob
);

// Remove a saved job
router.delete(
  "/:jobId",
  protect,
  authorize("jobseeker"),
  removeSavedJob
);

export default router;