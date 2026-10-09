import { Job } from "./job.model.js";
import { JobDetails } from "./jobDetails.js";
import { redisClient } from "../../config/redis.js";
import { createHash } from "crypto";
import {
  syncExpiredJobs,
  createOrUpdateJobDetails,
  getJobDetailsByJobId,
} from "./job.service.js";
import { trackJobSearch } from "../jobseekers/jobSearch.service.js";
import { JobSeeker } from "../jobseekers/jobseeker.model.js";
import { SavedJob } from "../jobseekers/savedJob.model.js";
import { Application } from "../applications/application.model.js";
import { JobSearch } from "../jobseekers/jobSearch.model.js";

export const createJob = async (req, res, next) => {
  try {
    const {
      title,
      subject,
      positionLevel,
      category,
      district,
      salaryRange,
      salaryType,
      experienceRequired,
      experienceType,
      qualification,
      jobDetails,
    } = req.body;

    console.log(req.body, "body");

    const recruiter = req.recruiter;

    // ---------------------------------------
    // BASIC REQUIRED FIELD VALIDATION
    // ---------------------------------------

    if (
      !title?.trim() ||
      !subject?.trim() ||
      !positionLevel?.trim() ||
      !category?.trim() ||
      !district?.trim()
    ) {
      return res.status(400).json({
        message:
          "Title, subject, position, category and district are required.",
      });
    }

    // ---------------------------------------
    // CATEGORY VALIDATION
    // ---------------------------------------

    const allowedCategories = [
      "Teaching",
      "Non Teaching",
      "Management",
      "Support Staff",
    ];

    if (!allowedCategories.includes(category)) {
      return res.status(400).json({
        message: "Invalid job category.",
      });
    }

    // ---------------------------------------
    // SALARY VALIDATION
    // ---------------------------------------

    const allowedSalaryTypes = ["fixed", "range"];

    if (!allowedSalaryTypes.includes(salaryType)) {
      return res.status(400).json({
        message: "Invalid salary type.",
      });
    }

    if (!salaryRange?.trim()) {
      return res.status(400).json({
        message: "Salary is required.",
      });
    }

    // ---------------------------------------
    // EXPERIENCE VALIDATION
    // ---------------------------------------

    const allowedExperienceTypes = ["fixed", "range"];

    if (!allowedExperienceTypes.includes(experienceType)) {
      return res.status(400).json({
        message: "Invalid experience type.",
      });
    }

    if (!experienceRequired?.trim()) {
      return res.status(400).json({
        message: "Experience required is required.",
      });
    }

    // ---------------------------------------
    // RANGE VALIDATION
    // ---------------------------------------

    if (salaryType === "range") {
      const salaryRangePattern =
        /^\s*₹?\s*\d[\d,]*(?:\.\d+)?\s*-\s*₹?\s*\d[\d,]*(?:\.\d+)?\s*$/;

      if (!salaryRangePattern.test(salaryRange)) {
        return res.status(400).json({
          message:
            "Invalid salary range. Please enter a range such as ₹35,000 - ₹40,000 or 3,50,000 - 4,00,000.",
        });
      }
    }

    if (experienceType === "range") {
      const experienceRangePattern = /^\s*[^-]+?\s*-\s*[^-]+?\s*$/;

      if (!experienceRangePattern.test(experienceRequired)) {
        return res.status(400).json({
          message:
            "Invalid experience range. Example: 2-4, 2 - 4, 2- 4 or 2 -4.",
        });
      }
    }
    // ---------------------------------------
    // APPLICATION QUESTION VALIDATION
    // ---------------------------------------

    const applicationQuestions = Array.isArray(jobDetails?.applicationQuestions)
      ? jobDetails.applicationQuestions
      : [];

    const allowedQuestionTypes = [
      "text",
      "textarea",
      "number",
      "single_choice",
      "multiple_choice",
      "yes_no",
    ];

    for (const question of applicationQuestions) {
      if (!question?.question?.trim()) {
        return res.status(400).json({
          message: "Every application question must have question text.",
        });
      }

      if (!allowedQuestionTypes.includes(question.type)) {
        return res.status(400).json({
          message: `Invalid application question type: ${question.type}`,
        });
      }

      if (typeof question.required !== "boolean") {
        return res.status(400).json({
          message: "Application question 'required' must be true or false.",
        });
      }

      if (["single_choice", "multiple_choice"].includes(question.type)) {
        if (!Array.isArray(question.options) || question.options.length === 0) {
          return res.status(400).json({
            message: `Options are required for ${question.type} questions.`,
          });
        }

        const hasEmptyOption = question.options.some(
          (option) => !String(option).trim(),
        );

        if (hasEmptyOption) {
          return res.status(400).json({
            message: "Application question options cannot be empty.",
          });
        }
      }
    }

    // ---------------------------------------
    // NORMALIZE SALARY
    // ---------------------------------------

    let salaryMin;
    let salaryMax;

    if (salaryType === "range") {
      const [minRaw, maxRaw] = salaryRange.split("-");

      const min = Number(minRaw.replace(/[₹,\s]/g, ""));

      const max = Number(maxRaw.replace(/[₹,\s]/g, ""));

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return res.status(400).json({
          message:
            "Invalid salary range. Please enter values such as ₹35,000 - ₹40,000 or 3,50,000 - 4,00,000.",
        });
      }

      if (min <= 0 || max <= 0) {
        return res.status(400).json({
          message: "Salary values must be greater than zero.",
        });
      }

      if (min > max) {
        return res.status(400).json({
          message: "Minimum salary cannot be greater than maximum salary.",
        });
      }

      salaryMin = min;
      salaryMax = max;
    } else {
      const salary = Number(salaryRange.replace(/[₹,\s]/g, ""));

      if (!Number.isFinite(salary) || salary <= 0) {
        return res.status(400).json({
          message: "Invalid salary. Please enter a valid salary amount.",
        });
      }

      salaryMin = salary;
      salaryMax = salary;
    }
    // ---------------------------------------
    // NORMALIZE EXPERIENCE
    // ---------------------------------------

    let experienceMin;
    let experienceMax;

    if (experienceType === "range") {
      const [minRaw, maxRaw] = experienceRequired.split("-");

      const min = Number(minRaw.trim());
      const max = Number(maxRaw.trim());

      if (!Number.isFinite(min) || !Number.isFinite(max)) {
        return res.status(400).json({
          message:
            "Invalid experience range. Please enter a range such as 1 - 2 or 2 - 5.",
        });
      }

      if (min < 0 || max < 0) {
        return res.status(400).json({
          message: "Experience cannot be negative.",
        });
      }

      if (min > max) {
        return res.status(400).json({
          message:
            "Minimum experience cannot be greater than maximum experience.",
        });
      }

      experienceMin = min;
      experienceMax = max;
    } else {
      const experience = Number(experienceRequired.trim());

      if (!Number.isFinite(experience) || experience < 0) {
        return res.status(400).json({
          message: "Invalid experience. Please enter a valid number of years.",
        });
      }

      experienceMin = experience;
      experienceMax = experience;
    }
    // ---------------------------------------
    // PLAN LIMIT CHECK
    // ---------------------------------------

    if (recruiter.jobsPosted >= recruiter.jobPostLimit) {
      return res.status(403).json({
        message: "Limit reached. Upgrade plan.",
      });
    }

    // ---------------------------------------
    // PLAN EXPIRY CHECK
    // ---------------------------------------

    if (recruiter.planExpiryDate && new Date() > recruiter.planExpiryDate) {
      return res.status(403).json({
        message: "Plan expired. Please upgrade your plan.",
      });
    }

    // ---------------------------------------
    // JOB HASH
    // ---------------------------------------

    const rawString = recruiter._id + subject + positionLevel + district;

    const jobHash = createHash("sha256").update(rawString).digest("hex");

    // ---------------------------------------
    // DUPLICATE CHECK
    // ---------------------------------------

    const now = new Date();

    const lastJob = await Job.findOne({
      recruiter: recruiter._id,
      jobHash,
    }).sort({
      createdAt: -1,
    });

    if (lastJob) {
      const diff = now - lastJob.createdAt;

      if (diff < 7 * 24 * 60 * 60 * 1000) {
        return res.status(403).json({
          message: "Wait 7 days before reposting same job.",
        });
      }
    }

    // ---------------------------------------
    // EXPIRY
    // ---------------------------------------

    const expiryDate = new Date();

    expiryDate.setDate(expiryDate.getDate() + 30);

    // ---------------------------------------
    // CREATE JOB
    // ---------------------------------------

    const job = await Job.create({
      title: title.trim(),
      subject: subject.trim(),
      positionLevel,
      category,
      district: district.trim(),

      salaryRange: salaryRange.trim(),
      salaryMin,
      salaryMax,
      salaryType,

      experienceRequired: experienceRequired.trim(),
      experienceType,
      experienceMin,
      experienceMax,

      qualification: qualification?.trim() || "",

      instituteName: recruiter.instituteName,

      recruiter: recruiter._id,

      jobHash,

      expiryDate,
    });
    const createdJobDetails = await JobDetails.create({
      job: job._id,

      jobPurpose: jobDetails?.jobPurpose || "",

      duties: Array.isArray(jobDetails?.duties) ? jobDetails.duties : [],

      keyDecisions: Array.isArray(jobDetails?.keyDecisions)
        ? jobDetails.keyDecisions
        : [],

      majorChallenges: Array.isArray(jobDetails?.majorChallenges)
        ? jobDetails.majorChallenges
        : [],

      skills: Array.isArray(jobDetails?.skills) ? jobDetails.skills : [],

      employmentType: jobDetails?.employmentType || "Full Time",

      department: jobDetails?.department || "",

      roleCategory: jobDetails?.roleCategory || "",

      industryType: jobDetails?.industryType || "",

      education: {
        ug: Array.isArray(jobDetails?.education?.ug)
          ? jobDetails.education.ug
          : [],

        pg: Array.isArray(jobDetails?.education?.pg)
          ? jobDetails.education.pg
          : [],

        professional: Array.isArray(jobDetails?.education?.professional)
          ? jobDetails.education.professional
          : [],
      },

      applicationQuestions: applicationQuestions.map((question) => ({
        question: question.question.trim(),
        type: question.type,
        options: Array.isArray(question.options)
          ? question.options
              .map((option) => String(option).trim())
              .filter(Boolean)
          : [],
        required: question.required,
      })),

      additionalInformation: jobDetails?.additionalInformation || "",
    });

    // ---------------------------------------
    // INCREMENT JOB COUNT
    // ---------------------------------------

    recruiter.jobsPosted += 1;

    await recruiter.save();

    // ---------------------------------------
    // CACHE INVALIDATION
    // ---------------------------------------

    if (redisClient) {
      try {
        const keys = await redisClient.keys("jobs:*");

        if (keys.length > 0) {
          await redisClient.del(keys);
        }
      } catch (err) {
        console.log("Cache invalidation failed");
      }
    }

    // ---------------------------------------
    // RESPONSE
    // ---------------------------------------

    return res.status(201).json({
      message: "Job created successfully",
      job,
      jobDetails: createdJobDetails,
    });
  } catch (error) {
    console.log("Create job error:", error);

    next(error);
  }
};
export const getPublicJobs = async (req, res, next) => {
  try {
    await syncExpiredJobs();

    const {
      district,
      subject,
      experience,
      qualification,
      freshness,
      status,
      keyword,
      sort,
      institute,
      page = 1,
      limit = 10,
    } = req.query;

    /*
     * Pagination
     */

    const pageNumber = Math.max(1, parseInt(page, 10) || 1);

    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10) || 10));

    const skip = (pageNumber - 1) * limitNumber;

    /*
     * Filter
     */

    const filter = {};

    /*
     * Status
     */

    if (status && status !== "all") {
      filter.status = status;
    }

    /*
     * District
     */

    if (district) {
      filter.district = district;
    }

    /*
     * Subject
     */

    if (subject) {
      filter.subject = subject;
    }

    /*
     * Qualification
     */

    if (qualification) {
      filter.qualification = qualification;
    }

    /*
     * Institute
     */

    if (institute) {
      filter.instituteName = {
        $regex: institute,
        $options: "i",
      };
    }

    /*
     * Experience
     */

    if (experience !== undefined && experience !== "") {
      filter.experienceRequired = {
        $lte: Number(experience),
      };
    }

    /*
     * Freshness
     */

    if (freshness) {
      const daysMap = {
        today: 1,
        yesterday: 2,
        "7days": 7,
        "15days": 15,
        "30days": 30,
      };

      const days = daysMap[freshness];

      if (days) {
        const date = new Date();

        date.setDate(date.getDate() - days);

        filter.createdAt = {
          $gte: date,
        };
      }
    }

    /*
     * Keyword Search
     */

    if (keyword && keyword.trim()) {
      filter.$text = {
        $search: keyword.trim(),
      };
    }

    /*
     * Sorting
     */

    let sortOption = {
      createdAt: -1,
    };

    switch (sort) {
      case "latest":
        sortOption = {
          createdAt: -1,
        };
        break;

      case "oldest":
        sortOption = {
          createdAt: 1,
        };
        break;

      case "experience_high":
        sortOption = {
          experienceRequired: -1,
        };
        break;

      case "experience_low":
        sortOption = {
          experienceRequired: 1,
        };
        break;

      default:
        sortOption = {
          createdAt: -1,
        };
    }

    /*
     * Query
     */

    const [jobs, total] = await Promise.all([
      Job.find(filter)
        .populate(
          "recruiter",
          `
              instituteName
              district
              isVerified
              verificationStatus
            `,
        )
        .sort(sortOption)
        .skip(skip)
        .limit(limitNumber),

      Job.countDocuments(filter),
    ]);

    /*
     * Response
     */

    return res.status(200).json({
      total,
      page: pageNumber,
      limit: limitNumber,
      totalPages: Math.ceil(total / limitNumber),
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const getHomeJobs = async (req, res, next) => {
  try {
    await syncExpiredJobs();

    const now = new Date();

    /*
      =========================
      ACTIVE JOBS ONLY
      =========================
    */

    const baseFilter = {
      status: "active",
      expiryDate: {
        $gte: now,
      },
    };

    const [latestJobs, boostedJobs, latestCount, boostedCount] =
      await Promise.all([
        /*
        LATEST ACTIVE JOBS
      */

        Job.find(baseFilter)
          .sort({
            createdAt: -1,
          })
          .limit(6),

        /*
        BOOSTED ACTIVE JOBS
      */

        Job.find({
          ...baseFilter,

          "promotion.isBoosted": true,

          "promotion.boostExpiresAt": {
            $gte: now,
          },
        })
          .sort({
            "promotion.priority": -1,
            "promotion.boostedAt": -1,
          })
          .limit(6),

        /*
        TOTAL ACTIVE JOBS
      */

        Job.countDocuments(baseFilter),

        /*
        TOTAL BOOSTED JOBS
      */

        Job.countDocuments({
          ...baseFilter,

          "promotion.isBoosted": true,

          "promotion.boostExpiresAt": {
            $gte: now,
          },
        }),
      ]);

    return res.json({
      latest: {
        count: latestCount,
        jobs: latestJobs,
      },

      boosted: {
        count: boostedCount,
        jobs: boostedJobs,
      },
    });
  } catch (error) {
    next(error);
  }
};
export const getJobDetails = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const [job, details] = await Promise.all([
      Job.findById(jobId),
      getJobDetailsByJobId(jobId),
    ]);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    return res.status(200).json({
      job,
      details,
    });
  } catch (error) {
    next(error);
  }
};
export const getSimilarJobs = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const currentJob = await Job.findById(jobId).lean();

    if (!currentJob) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    const now = new Date();

    /*
     * Build title keywords.
     * Example:
     * "Computer Lab Technician"
     * -> ["computer", "lab", "technician"]
     */
    const titleKeywords = (currentJob.title || "")
      .toLowerCase()
      .split(/\s+/)
      .map((word) => word.replace(/[^a-z0-9]/g, ""))
      .filter((word) => word.length >= 3);

    /*
     * Remove duplicate keywords.
     */
    const uniqueTitleKeywords = [...new Set(titleKeywords)];

    /*
     * Find possible matches using ONLY:
     * - title
     * - subject
     * - category
     */
    const orConditions = [];

    if (currentJob.subject) {
      orConditions.push({
        subject: currentJob.subject,
      });
    }

    if (currentJob.category) {
      orConditions.push({
        category: currentJob.category,
      });
    }
    if (currentJob.positionLevel) {
      orConditions.push({
        positionLevel: currentJob.positionLevel,
      });
    }

    uniqueTitleKeywords.forEach((keyword) => {
      orConditions.push({
        title: {
          $regex: keyword,
          $options: "i",
        },
      });
    });

    if (orConditions.length === 0) {
      return res.status(200).json({
        jobs: [],
      });
    }

    const possibleJobs = await Job.find({
      _id: {
        $ne: currentJob._id,
      },
      status: {
        $in: ["active", "expired"],
      },

      $or: orConditions,
    })
      .sort({
        createdAt: -1,
      })
      .limit(30)
      .lean();

    console.log(
      "SIMILAR JOB - POSSIBLE JOBS:",
      possibleJobs.map((job) => ({
        title: job.title,
        subject: job.subject,
        category: job.category,
        status: job.status,
        isActive: job.isActive,
        expiryDate: job.expiryDate,
      })),
    );

    /*
     * Calculate a simple similarity score.
     *
     * Title match    = 3 points per matching word
     * Subject match  = 2 points
     * Category match = 1 point
     */
    const currentTitleWords = new Set(uniqueTitleKeywords);

    const scoredJobs = possibleJobs.map((job) => {
      let score = 0;

      /*
       * TITLE MATCH
       */
      const jobTitleWords = (job.title || "")
        .toLowerCase()
        .split(/\s+/)
        .map((word) => word.replace(/[^a-z0-9]/g, ""))
        .filter((word) => word.length >= 3);

      const uniqueJobTitleWords = [...new Set(jobTitleWords)];

      uniqueJobTitleWords.forEach((word) => {
        if (currentTitleWords.has(word)) {
          score += 3;
        }
      });

      /*
       * SUBJECT MATCH
       */
      if (
        currentJob.subject &&
        job.subject &&
        currentJob.subject.toLowerCase() === job.subject.toLowerCase()
      ) {
        score += 2;
      }

      /*
       * CATEGORY MATCH
       */
      if (
        currentJob.category &&
        job.category &&
        currentJob.category.toLowerCase() === job.category.toLowerCase()
      ) {
        score += 1;
      }

      /*
       * POSITION LEVEL MATCH
       */
      if (
        currentJob.positionLevel &&
        job.positionLevel &&
        currentJob.positionLevel.toLowerCase() ===
          job.positionLevel.toLowerCase()
      ) {
        score += 2;
      }

      return {
        ...job,
        similarityScore: score,
      };
    });

    /*
     * Highest similarity first.
     * Newer jobs win when similarity is equal.
     */
    scoredJobs.sort((a, b) => {
      if (b.similarityScore !== a.similarityScore) {
        return b.similarityScore - a.similarityScore;
      }

      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    const jobs = scoredJobs
      .slice(0, 6)
      .map(({ similarityScore, ...job }) => job);
    return res.status(200).json({
      jobs,
    });
  } catch (error) {
    next(error);
  }
};

export const getRecommendedJobs = async (req, res, next) => {
  try {
    await syncExpiredJobs();

    if (req.user.role !== "jobseeker") {
      return res.status(403).json({
        message: "Only job seekers can access recommendations",
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

    const now = new Date();

    /*
      Get user activity
    */

    const [savedJobs, applications, searches] = await Promise.all([
      SavedJob.find({
        jobSeeker: jobSeeker._id,
      }).populate("job"),

      Application.find({
        jobSeeker: jobSeeker._id,
      }).populate("job"),

      JobSearch.find({
        jobSeeker: jobSeeker._id,
      })
        .sort({
          searchCount: -1,
          lastSearchedAt: -1,
        })
        .limit(10),
    ]);

    /*
      Collect preferences
    */

    const subjects = new Set(jobSeeker.subjects || []);

    const districts = new Set([
      ...(jobSeeker.preferredDistricts || []),

      ...(jobSeeker.district ? [jobSeeker.district] : []),
    ]);

    const categories = new Set(jobSeeker.preferredCategories || []);

    /*
      Learn from saved jobs
    */

    savedJobs.forEach((item) => {
      const job = item.job;

      if (!job) return;

      if (job.subject) {
        subjects.add(job.subject);
      }

      if (job.district) {
        districts.add(job.district);
      }

      if (job.category) {
        categories.add(job.category);
      }
    });

    /*
      Learn from applied jobs
    */

    applications.forEach((application) => {
      const job = application.job;

      if (!job) return;

      if (job.subject) {
        subjects.add(job.subject);
      }

      if (job.district) {
        districts.add(job.district);
      }

      if (job.category) {
        categories.add(job.category);
      }
    });

    /*
      Get applied job IDs

      Don't recommend jobs
      the user already applied to
    */

    const appliedJobIds = applications
      .map((application) => {
        return application.job?._id;
      })
      .filter(Boolean);

    /*
      Get active jobs only
    */

    const jobs = await Job.find({
      status: "active",

      expiryDate: {
        $gte: now,
      },

      _id: {
        $nin: appliedJobIds,
      },
    });

    /*
      Prepare search keywords
    */

    const searchKeywords = searches.map((search) => search.keyword);

    /*
      Score every job
    */

    const scoredJobs = jobs.map((job) => {
      let score = 0;

      /*
        Subject Match
      */

      if (job.subject && subjects.has(job.subject)) {
        score += 5;
      }

      /*
        District Match
      */

      if (job.district && districts.has(job.district)) {
        score += 4;
      }

      /*
        Category Match
      */

      if (job.category && categories.has(job.category)) {
        score += 3;
      }

      /*
        Experience Match

        Job requires experience
        less than or equal to
        candidate experience
      */

      if (
        typeof job.experienceRequired === "number" &&
        job.experienceRequired <= jobSeeker.experienceYears
      ) {
        score += 2;
      }

      /*
        Qualification Match
      */

      if (
        job.qualification &&
        jobSeeker.highestQualification &&
        job.qualification
          .toLowerCase()
          .includes(jobSeeker.highestQualification.toLowerCase())
      ) {
        score += 2;
      }

      /*
        Search Keyword Match
      */

      searchKeywords.forEach((keyword) => {
        const normalizedKeyword = keyword.toLowerCase();

        const title = job.title?.toLowerCase() || "";

        const subject = job.subject?.toLowerCase() || "";

        const institute = job.instituteName?.toLowerCase() || "";

        if (
          title.includes(normalizedKeyword) ||
          subject.includes(normalizedKeyword) ||
          institute.includes(normalizedKeyword)
        ) {
          score += 3;
        }
      });

      /*
        Small boost for promoted jobs
      */

      if (job.promotion?.isBoosted && job.promotion?.boostExpiresAt >= now) {
        score += 1;
      }

      return {
        job,
        score,
      };
    });

    /*
      Sort by:

      1. Recommendation score
      2. Latest job
    */

    scoredJobs.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return new Date(b.job.createdAt) - new Date(a.job.createdAt);
    });

    /*
      Return top recommendations
    */

    const recommendedJobs = scoredJobs.slice(0, 20).map((item) => ({
      ...item.job.toObject(),

      recommended: true,

      recommendationScore: item.score,
    }));

    res.json({
      total: recommendedJobs.length,

      jobs: recommendedJobs,

      recommendationSources: {
        savedJobs: savedJobs.length,

        appliedJobs: applications.length,

        searches: searches.length,

        profile: {
          subjects: jobSeeker.subjects?.length || 0,

          districts: jobSeeker.preferredDistricts?.length || 0,

          categories: jobSeeker.preferredCategories?.length || 0,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

export const updateJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      recruiter: req.recruiter._id,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    Object.assign(job, req.body);

    await job.save();
    if (redisClient) {
      try {
        const keys = await redisClient.keys("jobs:*");

        if (keys.length) {
          await redisClient.del(keys);
        }
      } catch (err) {
        console.log("Cache invalidation failed");
      }
    }
    res.json({
      message: "Job updated successfully",
      job,
    });
  } catch (error) {
    next(error);
  }
};
export const updateJobDetails = async (req, res, next) => {
  try {
    const { jobId } = req.params;

    const job = await Job.findOne({
      _id: jobId,
      recruiter: req.recruiter._id,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    const details = await createOrUpdateJobDetails(jobId, req.body);

    return res.status(200).json({
      message: "Job details saved successfully.",
      details,
    });
  } catch (error) {
    next(error);
  }
};

export const deactivateJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      recruiter: req.recruiter._id,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    job.status = "inactive";

    await job.save();

    if (redisClient) {
      try {
        const keys = await redisClient.keys("jobs:*");

        if (keys.length) {
          await redisClient.del(keys);
        }
      } catch (err) {
        console.log("Cache invalidation failed");
      }
    }

    res.json({
      message: "Job deactivated",
      job,
    });
  } catch (error) {
    next(error);
  }
};
export const activateJob = async (req, res, next) => {
  try {
    const job = await Job.findOne({
      _id: req.params.jobId,
      recruiter: req.recruiter._id,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    job.status = "active";

    const expiryDate = new Date();

    expiryDate.setDate(expiryDate.getDate() + 30);

    job.expiryDate = expiryDate;

    await job.save();

    res.json({
      message: "Job activated",
      job,
    });
  } catch (error) {
    next(error);
  }
};

export const deleteJob = async (req, res, next) => {
  try {
    const recruiter = req.recruiter;

    const job = await Job.findOne({
      _id: req.params.jobId,
      recruiter: recruiter._id,
    });

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    await job.deleteOne();

    // Free one job slot
    recruiter.jobsPosted = Math.max(0, recruiter.jobsPosted - 1);
    await recruiter.save();

    // Clear jobs cache
    if (redisClient) {
      try {
        const keys = await redisClient.keys("jobs:*");
        if (keys.length) {
          await redisClient.del(keys);
        }
      } catch (err) {
        console.log("Cache invalidation failed");
      }
    }

    res.json({
      message: "Job deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const getRecruiterJobs = async (req, res, next) => {
  try {
    const recruiterId = req.recruiter._id;

    const jobs = await Job.find({ recruiter: recruiterId }).sort({
      createdAt: -1,
    });

    res.json({
      total: jobs.length,
      jobs,
    });
  } catch (error) {
    next(error);
  }
};
