import bcrypt from "bcryptjs";
import mongoose from "mongoose";
import { User } from "../users/user.model.js";
import { Recruiter } from "./recruiter.model.js";
import { Job } from "../jobs/job.model.js";
import { Application } from "../applications/application.model.js";

export const registerRecruiter = async (req, res, next) => {
  try {
    const { name, email, password, instituteName, district } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Create user
    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "recruiter",
    });

    // Create recruiter profile
    const recruiter = await Recruiter.create({
      user: user._id,
      instituteName,
      district,
      isVerified: false,
    });

    res.status(201).json({
      message:
        "Recruiter registered successfully. Awaiting admin verification.",
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

export const submitRecruiterProfile = async (req, res, next) => {
  try {
    const { instituteName, district, contactPhone, subscriptionPlan } =
      req.body;

    let recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!instituteName || !district || !contactPhone) {
      return res.status(400).json({
        message: "Institute name, district and contact number are required",
      });
    }

    if (recruiter) {
      recruiter.instituteName = instituteName;
      recruiter.district = district;
      recruiter.contactPhone = contactPhone;

      recruiter.subscriptionPlan =
        subscriptionPlan || recruiter.subscriptionPlan || "free_trial";

      recruiter.isVerified = false;
      recruiter.profileCompleted = true;
      recruiter.rejectionReason = "";
      recruiter.verificationStatus = "under_review";

      recruiter.verificationTimeline.push({
        status: "under_review",
        date: new Date(),
      });

      await recruiter.save();

      return res.status(200).json({
        message: "Profile submitted successfully. Awaiting admin verification.",
        recruiter,
      });
    }
    recruiter = await Recruiter.create({
      user: req.user.id,
      instituteName,
      district,
      subscriptionPlan: subscriptionPlan || "",
      isVerified: false,
      verificationStatus: "submitted",
      verificationTimeline: [
        {
          status: "submitted",
          date: new Date(),
        },
      ],
    });

    res.status(201).json({
      message: "Profile submitted successfully. Awaiting admin verification.",
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({
      user: req.user.id,
    }).populate("user", "name email");

    res.json(recruiter);
  } catch (error) {
    next(error);
  }
};

export const getAllRecruiters = async (req, res, next) => {
  try {
    const { verified } = req.query;

    let filter = {};

    if (verified === "true") filter.isVerified = true;
    if (verified === "false") filter.isVerified = false;

    const recruiters = await Recruiter.find(filter)
      .populate("user", "name email role")
      .sort({ createdAt: -1 });

    res.json({
      count: recruiters.length,
      recruiters,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyRecruiter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const recruiter = await Recruiter.findById(id);

    if (!recruiter) {
      return res.status(404).json({ message: "Recruiter not found" });
    }

    recruiter.isVerified = true;
    await recruiter.save();

    res.json({
      message: "Recruiter verified successfully",
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

export const getMyJobs = async (req, res, next) => {
  try {
    const jobs = await Job.find({
      recruiter: req.recruiter._id,
    }).sort({ createdAt: -1 });

    res.json(jobs);
  } catch (error) {
    next(error);
  }
};

export const getJobSummary = async (req, res, next) => {
  try {
    const activeJobs = await Job.countDocuments({
      recruiter: req.recruiter._id,
      status: "active",
    });

    const expiredJobs = await Job.countDocuments({
      recruiter: req.recruiter._id,
      status: "expired",
    });

    res.json({
      jobsPosted: req.recruiter.jobsPosted,
      jobPostLimit: req.recruiter.jobPostLimit,
      activeJobs,
      expiredJobs,
      subscriptionPlan: req.recruiter.subscriptionPlan,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecruiterDashboardStats = async (req, res, next) => {
  try {
    const recruiterId = req.recruiterProfile._id;

    const totalJobs = await Job.countDocuments({ recruiter: recruiterId });
    const activeJobs = await Job.countDocuments({
      recruiter: recruiterId,
      isActive: true,
    });
    const totalApplications = await Application.countDocuments({
      recruiter: recruiterId,
    });
    const shortlisted = await Application.countDocuments({
      recruiter: recruiterId,
      status: "shortlisted",
    });

    res.json({
      totalJobs,
      activeJobs,
      totalApplications,
      shortlisted,
    });
  } catch (error) {
    next(error);
  }
};

export const getApplicationsPerJob = async (req, res, next) => {
  if (req.recruiterProfile.subscriptionPlan !== "pro") {
    return res.status(403).json({
      message: "Upgrade to premium to access advanced analytics",
    });
  }
  try {
    const recruiterId = req.recruiterProfile._id;
    const data = await Application.aggregate([
      {
        $match: {
          recruiter: new mongoose.Types.ObjectId(recruiterId),
        },
      },
      {
        $group: {
          _id: "$job",
          totalApplications: { $sum: 1 },
        },
      },
      {
        $lookup: {
          from: "jobs",
          localField: "_id",
          foreignField: "_id",
          as: "jobDetails",
        },
      },
      { $unwind: "$jobDetails" },
      {
        $project: {
          jobId: "$_id",
          title: "$jobDetails.title",
          subject: "$jobDetails.subject",
          district: "$jobDetails.district",
          totalApplications: 1,
        },
      },
      { $sort: { totalApplications: -1 } },
    ]);

    res.json(data);
  } catch (error) {
    next(error);
  }
};

export const getApplicationTrend = async (req, res, next) => {
  if (req.recruiterProfile.subscriptionPlan !== "pro") {
    return res.status(403).json({
      message: "Upgrade to premium to access advanced analytics",
    });
  }
  try {
    const recruiterId = req.recruiterProfile._id;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const trend = await Application.aggregate([
      {
        $match: {
          recruiter: recruiterId,
          createdAt: { $gte: sevenDaysAgo },
        },
      },
      {
        $group: {
          _id: {
            $dateToString: {
              format: "%Y-%m-%d",
              date: "$createdAt",
            },
          },
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    res.json(trend);
  } catch (error) {
    next(error);
  }
};

export const getJobPerformance = async (req, res, next) => {
  if (req.recruiterProfile.subscriptionPlan !== "pro") {
    return res.status(403).json({
      message: "Upgrade to premium to access advanced analytics",
    });
  }
  try {
    const recruiterId = req.recruiterProfile._id;

    const jobs = await Job.find({ recruiter: recruiterId });

    const performanceData = [];

    for (let job of jobs) {
      const applications = await Application.countDocuments({
        job: job._id,
      });

      const daysActive =
        (new Date() - new Date(job.createdAt)) / (1000 * 60 * 60 * 24);

      const score = daysActive > 0 ? applications / daysActive : applications;

      let label = "Low";

      if (score > 2) label = "High";
      else if (score > 1) label = "Moderate";

      performanceData.push({
        jobId: job._id,
        title: job.title,
        totalApplications: applications,
        daysActive: Math.floor(daysActive),
        performanceScore: score.toFixed(2),
        label,
      });
    }

    res.json(performanceData);
  } catch (error) {
    next(error);
  }
};

export const upgradePlan = async (req, res, next) => {
  try {
    const recruiter = req.recruiterProfile;

    recruiter.subscriptionPlan = "pro";
    recruiter.jobPostLimit = 50;

    await recruiter.save();

    res.json({
      message: "Upgraded to premium successfully",
      recruiter,
    });
  } catch (error) {
    next(error);
  }
};

export const getResumeDownloadLink = async (req, res, next) => {
  try {
    const application = await Application.findById(
      req.params.applicationId,
    ).populate("jobSeeker");

    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (application.recruiter.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    const resumeKey = application.jobSeeker.resumeKey;

    const downloadUrl = await generateResumeDownloadUrl(resumeKey);

    res.json({
      downloadUrl,
    });
  } catch (error) {
    next(error);
  }
};

export const updateRecruiterProfile = async (req, res, next) => {
  try {
    const { name, instituteName, district, contactPhone } = req.body;

    // 1️⃣ Get recruiter
    const recruiter = await Recruiter.findOne({ user: req.userId });

    if (!recruiter) {
      return res.status(404).json({
        message: "Recruiter not found",
      });
    }

    // 2️⃣ Update recruiter fields
    if (instituteName !== undefined) {
      recruiter.instituteName = instituteName;
    }

    if (district !== undefined) {
      recruiter.district = district;
    }

    if (contactPhone !== undefined) {
      recruiter.contactPhone = contactPhone;
    }
    await recruiter.save();

    // 3️⃣ Update user fields (name)
    if (name) {
      await User.findByIdAndUpdate(req.user.id, { name });
    }

    // 4️⃣ Return updated profile
    const updatedRecruiter = await Recruiter.findOne({
      user: req.user.id,
    }).populate("user", "name email");

    res.json({
      message: "Profile updated successfully",
      recruiter: updatedRecruiter,
    });
  } catch (error) {
    next(error);
  }
};
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    const user = await User.findById(req.userId).select("+password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(400).json({
        message: "Current password is incorrect",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    await user.save();

    res.json({ message: "Password updated successfully" });
  } catch (error) {
    next(error);
  }
};
