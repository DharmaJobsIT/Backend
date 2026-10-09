import express from "express";

import {
  protect,
  authorize,
} from "../../middleware/auth.middleware.js";

import { attachRecruiter } from "../../middleware/attachRecruiter.js";

import { requireVerifiedRecruiter } from "../../middleware/requireVerifiedRecruiter.js";

import {
  getJobDetails,
  updateJobDetails,
} from "./job.controller.js";

const router = express.Router();

router.get(
  "/:jobId/details",
  getJobDetails
);

router.put(
  "/:jobId/details",
  protect,
  authorize("recruiter"),
  attachRecruiter,
  requireVerifiedRecruiter,
  updateJobDetails
);

export default router;