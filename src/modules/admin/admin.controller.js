import { Recruiter } from "../recruiters/recruiter.model.js";
import { Job } from "../jobs/job.model.js";
import { Application } from "../applications/application.model.js";

/**
 * Get all recruiters
 */
export const getAllRecruiters = async (req, res, next) => {
  try {
    const recruiters = await Recruiter.find().populate("user", "name email");

    res.json(recruiters);
  } catch (error) {
    next(error);
  }
};

export const markRecruiterUnderReview = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    if (
      recruiter.verificationStatus === "under_review" ||
      recruiter.verificationStatus === "verified"
    ) {
      return res.json({
        message: `Recruiter already ${recruiter.verificationStatus}`,
        recruiter,
      });
    }

    recruiter.verificationStatus = "under_review";

    recruiter.verificationTimeline.push({
      status: "under_review",
      date: new Date(),
    });

    await recruiter.save();

    res.json({
      message: "Recruiter moved to under review",
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Verify recruiter
 */
export const verifyRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({ message: "Recruiter not found" });
    }
    if (!recruiter.profileCompleted) {
      return res.status(400).json({
        message: "Recruiter profile must be completed before verification",
      });
    }
    if (
      !recruiter.instituteName ||
      !recruiter.district ||
      !recruiter.contactPhone
    ) {
      return res.status(400).json({
        message:
          "Institute name, district and contact number are required before verification",
      });
    }

    recruiter.isVerified = true;
    recruiter.rejectionReason = "";
    recruiter.verificationStatus = "verified";
    recruiter.subscriptionPlan = "free_trial";
    recruiter.jobPostLimit = 1;
    recruiter.planStartDate = new Date();

    const expiry = new Date();
    expiry.setDate(expiry.getDate() + 7);
    recruiter.planExpiryDate = expiry;

    recruiter.verificationTimeline.push({
      status: "verified",
      date: new Date(),
    });

    await recruiter.save();

    res.json({
      message: "Recruiter verified successfully",
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

export const rejectRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    recruiter.isVerified = false;
    recruiter.rejectionReason = req.body.reason || "Not specified";
    recruiter.verificationStatus = "rejected";

    recruiter.verificationTimeline.push({
      status: "rejected",
      date: new Date(),
    });

    await recruiter.save();

    res.json({
      message: "Recruiter rejected",
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Block recruiter
 */
export const blockRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findById(req.params.id);

    if (!recruiter) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    recruiter.isBlocked = true;
    await recruiter.save();

    res.json({ message: "Recruiter blocked successfully" });
  } catch (error) {
    next(error);
  }
};

/**
 * Get all jobs
 */
export const getAllJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find().populate("recruiter");

    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

/**
 * Get all applications
 */
export const getAllApplications = async (req, res, next) => {
  try {
    const applications = await Application.find()
      .populate("job")
      .populate("jobSeeker");

    res.json(applications);
  } catch (error) {
    next(error);
  }
};
