import bcrypt from "bcryptjs";
import { User } from "../users/user.model.js";
import { JobSeeker } from "./jobseeker.model.js";
import { generateSignedUrl } from "../../services/s3Upload.service.js";
import {
  getCachedJobSeekerProfile,
  cacheJobSeekerProfile,
  invalidateJobSeekerProfileCache,
} from "../../services/jobSeekerCache.service.js";

export const registerJobSeeker = async (req, res, next) => {
  try {
    const { name, email, password, qualification, experienceYears, district } =
      req.body;

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "jobseeker",
    });

    const jobSeeker = await JobSeeker.create({
      user: user._id,
      fullName: name,
      highestQualification: qualification,
      experienceYears,
      district,
    });

    res.status(201).json({
      message: "Job Seeker registered successfully",
      jobSeeker,
    });
  } catch (error) {
    next(error);
  }
};

export const getJobSeekerProfile = async (req, res, next) => {
  try {
    const jobSeekerId = req.user._id;

    // 1. Try Redis first
    let profile = await getCachedJobSeekerProfile(jobSeekerId);

    // 2. Redis MISS → fetch from MongoDB
    if (!profile) {
      const jobSeeker = await JobSeeker.findOne({
        user: jobSeekerId,
      }).populate("user", "name email");

      if (!jobSeeker) {
        return res.status(404).json({
          message: "Job seeker profile not found",
        });
      }

      profile = jobSeeker.toObject();

      // 3. Cache the raw profile
      await cacheJobSeekerProfile(jobSeekerId, profile);
    }

    // 4. Generate fresh signed URLs
    //    Never cache these signed URLs in Redis.
    if (profile.profilePhoto) {
      profile.profilePhoto = await generateSignedUrl(profile.profilePhoto);
    }

    if (profile.resumeUrl) {
      profile.resumeUrl = await generateSignedUrl(profile.resumeUrl);
    }

    // 5. Send profile to frontend
    res.json({
      jobSeeker: profile,
    });
  } catch (error) {
    next(error);
  }
};

export const updateJobSeekerProfile = async (req, res, next) => {
  try {
    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    });

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found",
      });
    }

    const allowedFields = [
      "fullName",
      "highestQualification",
      "experienceYears",
      "experience",
      "phone",
      "dateOfBirth",
      "gender",
      "subjects",
      "preferredCategories",
      "preferredDistricts",
      "expectedSalary",
      "about",
      "skills",
      "district",
      "jobStatus",
      "currentSalary",
    ];

    allowedFields.forEach((field) => {
      if (req.body[field] !== undefined) {
        jobSeeker[field] = req.body[field];
      }
    });

    await jobSeeker.save();

    // Invalidate cached profile
    await invalidateJobSeekerProfileCache(req.user._id);

    const updatedProfile = await JobSeeker.findById(jobSeeker._id).populate(
      "user",
      "name email",
    );

    res.json({
      message: "Profile updated successfully",
      jobSeeker: updatedProfile,
    });
  } catch (error) {
    next(error);
  }
};
