import { uploadProfilePhotoToS3 } from "../../services/s3Upload.service.js";
import { JobSeeker } from "./jobseeker.model.js";
import { invalidateJobSeekerProfileCache } from "../../services/jobSeekerCache.service.js";

export const uploadProfilePhoto = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No profile photo uploaded",
      });
    }

    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    });

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found",
      });
    }

    const photoUpload = await uploadProfilePhotoToS3(req.file, jobSeeker._id);

    // Store the S3 object key, not a public URL.
    jobSeeker.profilePhoto = photoUpload.key;

    await jobSeeker.save();
    await invalidateJobSeekerProfileCache(req.user._id);

    res.json({
      message: "Profile photo uploaded successfully",
      profilePhoto: {
        key: photoUpload.key,
        fileName: req.file.originalname,
        uploadedAt: new Date(),
      },
    });
  } catch (error) {
    next(error);
  }
};
