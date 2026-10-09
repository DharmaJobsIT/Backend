import { uploadResumeToS3 } from "../../services/s3Upload.service.js";
import { JobSeeker } from "./jobseeker.model.js";
import { invalidateJobSeekerProfileCache } from "../../services/jobSeekerCache.service.js";

export const uploadResume = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        message: "No file uploaded",
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

    const resumeUpload = await uploadResumeToS3(req.file, jobSeeker._id);

    jobSeeker.resumeUrl = resumeUpload.key;
    jobSeeker.resumeFileName = req.file.originalname;
    jobSeeker.resumeUpdatedAt = new Date();

    await jobSeeker.save();
    await invalidateJobSeekerProfileCache(req.user._id);

    res.json({
      message: "Resume uploaded successfully",
      resume: {
        key: resumeUpload.key,
        resumeNumber: resumeUpload.resumeNumber,
        fileName: req.file.originalname,
        uploadedAt: jobSeeker.resumeUpdatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};
