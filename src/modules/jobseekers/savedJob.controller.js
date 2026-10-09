import { SavedJob } from "./savedJob.model.js";
import { JobSeeker } from "./jobseeker.model.js";
import { Job } from "../jobs/job.model.js";
import { JobDetails } from "../jobs/jobDetails.js";
import { syncExpiredJobs } from "../jobs/job.service.js";

// ==========================================================
// SAVE JOB
// ==========================================================

export const saveJob = async (req, res, next) => {
  try {
    if (req.user.role !== "jobseeker") {
      return res.status(403).json({
        message: "Only job seekers can save jobs",
      });
    }

    const { jobId } = req.params;

    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    });

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found",
      });
    }

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    const existing = await SavedJob.findOne({
      job: jobId,
      jobSeeker: jobSeeker._id,
    });

    if (existing) {
      return res.status(400).json({
        message: "Job is already saved",
      });
    }

    const savedJob = await SavedJob.create({
      job: jobId,
      jobSeeker: jobSeeker._id,
    });

    res.status(201).json({
      message: "Job saved successfully",
      savedJob,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// REMOVE SAVED JOB
// ==========================================================

export const removeSavedJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    });

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found",
      });
    }

    const savedJob = await SavedJob.findOneAndDelete({
      job: jobId,
      jobSeeker: jobSeeker._id,
    });

    if (!savedJob) {
      return res.status(404).json({
        message: "Saved job not found",
      });
    }

    res.json({
      message: "Job removed from saved jobs",
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// GET SAVED JOBS
// ==========================================================

export const getSavedJobs = async (req, res, next) => {
  try {
    await syncExpiredJobs();

    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    });

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found",
      });
    }

    const savedJobs = await SavedJob.find({
      jobSeeker: jobSeeker._id,
    })
      .populate({
        path: "job",
        populate: {
          path: "recruiter",
          select:
            "instituteName district isVerified verificationStatus",
        },
      })
      .sort({
        createdAt: -1,
      });

    // Fetch JobDetails for every saved job
    const savedJobsWithDetails = await Promise.all(
      savedJobs.map(async (savedJob) => {
        const job = savedJob.job;

        if (!job) {
          return {
            ...savedJob.toObject(),
            jobDetails: null,
          };
        }

        const jobDetails = await JobDetails.findOne({
          job: job._id,
        });

        return {
          ...savedJob.toObject(),
          jobDetails,
        };
      })
    );

    res.json({
      total: savedJobsWithDetails.length,
      savedJobs: savedJobsWithDetails,
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================================
// GET SAVED JOB STATUS
// ==========================================================

export const getSavedJobStatus = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    });

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found",
      });
    }

    const savedJob = await SavedJob.findOne({
      job: jobId,
      jobSeeker: jobSeeker._id,
    });

    res.json({
      saved: Boolean(savedJob),
    });
  } catch (error) {
    next(error);
  }
};