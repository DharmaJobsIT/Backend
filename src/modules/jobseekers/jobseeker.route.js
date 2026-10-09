import express from "express";
import { registerJobSeeker, getJobSeekerProfile, updateJobSeekerProfile } from "./jobseeker.controller.js";
import { uploadResume } from "./resume.controller.js";
import { uploadProfilePhoto } from "./profilePhoto.controller.js";
import { uploadResumeMiddleware } from "../../middleware/upload.middleware.js";
import { uploadImageMiddleware } from "../../middleware/uploadImage.middleware.js";
import { protect } from "../../middleware/auth.middleware.js";

const router = express.Router();

router.post("/register", registerJobSeeker);
router.get(
  "/me",
  protect,
  getJobSeekerProfile
);

router.patch(
  "/me",
  protect,
  updateJobSeekerProfile
);
router.post(
  "/upload-resume",
  protect,
  uploadResumeMiddleware.single("resume"),
  uploadResume
);
router.post(
  "/upload-profile-photo",
  protect,
  uploadImageMiddleware.single("profilePhoto"),
  uploadProfilePhoto
);

export default router;