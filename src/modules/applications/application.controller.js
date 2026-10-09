import { Application } from "./application.model.js";
import { Job } from "../jobs/job.model.js";
import { JobDetails } from "../jobs/jobDetails.js";
import { JobSeeker } from "../jobseekers/jobseeker.model.js";
import { sendEmail } from "../../services/email.service.js";
import { Recruiter } from "../recruiters/recruiter.model.js";

export const getApplyForm = async (req, res, next) => {
  try {
    if (req.user.role !== "jobseeker") {
      return res.status(403).json({
        message: "Only job seekers can access the application form",
      });
    }

    const { jobId } = req.params;

    // ---------------------------------------
    // GET JOB
    // ---------------------------------------

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    // ---------------------------------------
    // GET JOB SEEKER PROFILE
    // ---------------------------------------

    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    }).populate("user", "name email");

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found.",
      });
    }

    // ---------------------------------------
    // CHECK EXISTING APPLICATION
    // ---------------------------------------

    const existingApplication = await Application.findOne({
      job: job._id,
      jobSeeker: jobSeeker._id,
    });

    if (existingApplication) {
      return res.status(400).json({
        message: "You have already applied for this job.",
      });
    }

    // ---------------------------------------
    // GET JOB DETAILS
    // ---------------------------------------

    const jobDetails = await JobDetails.findOne({
      job: job._id,
    });

    // ---------------------------------------
    // RESPONSE
    // ---------------------------------------

    return res.status(200).json({
      job: {
        _id: job._id,
        title: job.title,
        subject: job.subject,
        positionLevel: job.positionLevel,
        category: job.category,
        district: job.district,
        salaryRange: job.salaryRange,
        salaryType: job.salaryType,
        experienceRequired: job.experienceRequired,
        experienceType: job.experienceType,
        qualification: job.qualification,
      },

      jobDetails: {
        jobPurpose: jobDetails?.jobPurpose || "",
        duties: jobDetails?.duties || [],
        keyDecisions: jobDetails?.keyDecisions || [],
        majorChallenges: jobDetails?.majorChallenges || [],
        skills: jobDetails?.skills || [],
        employmentType: jobDetails?.employmentType || "",
        department: jobDetails?.department || "",
        roleCategory: jobDetails?.roleCategory || "",
        industryType: jobDetails?.industryType || "",
        education: {
          ug: jobDetails?.education?.ug || [],
          pg: jobDetails?.education?.pg || [],
          professional: jobDetails?.education?.professional || [],
        },
        applicationQuestions: jobDetails?.applicationQuestions || [],
        additionalInformation: jobDetails?.additionalInformation || "",
      },

      jobSeeker: {
        _id: jobSeeker._id,
        fullName: jobSeeker.fullName || jobSeeker.user?.name || "",
        phone: jobSeeker.phone || "",
        email: jobSeeker.user?.email || "",
        district: jobSeeker.district || "",
        highestQualification: jobSeeker.highestQualification || "",
        experienceYears: jobSeeker.experienceYears ?? 0,
        experience: jobSeeker.experience || [],
        currentSalary: jobSeeker.currentSalary ?? null,
        expectedSalary: jobSeeker.expectedSalary || "",
        about: jobSeeker.about || "",
        skills: jobSeeker.skills || [],
        resumeUrl: jobSeeker.resumeUrl || "",
        resumeFileName: jobSeeker.resumeFileName || "",
        resumeUpdatedAt: jobSeeker.resumeUpdatedAt || null,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getJobApplicationStatus = async (req, res, next) => {
  try {
    if (req.user.role !== "jobseeker") {
      return res.status(403).json({
        message: "Only job seekers can access application status",
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

    const application = await Application.findOne({
      job: jobId,
      jobSeeker: jobSeeker._id,
    }).select("_id status createdAt updatedAt");

    return res.json({
      applied: Boolean(application),
      application: application || null,
    });
  } catch (error) {
    next(error);
  }
};

export const getJobSeekerApplications = async (req, res, next) => {
  try {
    if (req.user.role !== "jobseeker") {
      return res.status(403).json({
        message: "Only job seekers can access applications",
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

    const applications = await Application.find({
      jobSeeker: jobSeeker._id,
    })
      .populate("job")
      .sort({
        createdAt: -1,
      });

    return res.json({
      total: applications.length,
      applications,
    });
  } catch (error) {
    next(error);
  }
};

export const applyToJob = async (req, res, next) => {
  try {
    if (req.user.role !== "jobseeker") {
      return res.status(403).json({
        message: "Only job seekers can apply",
      });
    }

    const { jobId } = req.params;

    const { applicantSnapshot = {}, applicationQuestions = [] } = req.body;

    // ----------------------------------------------------------
    // GET JOB
    // ----------------------------------------------------------

    const job = await Job.findById(jobId);

    if (!job) {
      return res.status(404).json({
        message: "Job not found",
      });
    }

    // ----------------------------------------------------------
    // CHECK JOB STATUS / EXPIRY
    // ----------------------------------------------------------

    const now = new Date();

    if (
      job.status === "inactive" ||
      job.status === "expired" ||
      (job.expiryDate && new Date(job.expiryDate) < now)
    ) {
      return res.status(400).json({
        message: "This job is no longer accepting applications.",
      });
    }

    // ----------------------------------------------------------
    // GET JOB SEEKER
    // ----------------------------------------------------------

    const jobSeeker = await JobSeeker.findOne({
      user: req.user._id,
    }).populate("user", "name email");

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found.",
      });
    }

    // ----------------------------------------------------------
    // CHECK EXISTING APPLICATION
    // ----------------------------------------------------------

    const existing = await Application.findOne({
      job: job._id,
      jobSeeker: jobSeeker._id,
    });

    if (existing) {
      return res.status(400).json({
        message: "You have already applied for this job.",
      });
    }

    // ----------------------------------------------------------
    // GET JOB DETAILS / QUESTIONS
    // ----------------------------------------------------------

    const jobDetails = await JobDetails.findOne({
      job: job._id,
    });

    const employerQuestions = jobDetails?.applicationQuestions || [];

    // ----------------------------------------------------------
    // VALIDATE APPLICANT DETAILS
    // ----------------------------------------------------------

    const fullName = String(
      applicantSnapshot.fullName ??
        jobSeeker.fullName ??
        jobSeeker.user?.name ??
        "",
    ).trim();

    const phone = String(
      applicantSnapshot.phone ?? jobSeeker.phone ?? "",
    ).trim();

    // Always use the authenticated user's email.
    const email =
      jobSeeker.user?.email || String(applicantSnapshot.email || "").trim();

    const district = String(
      applicantSnapshot.district ?? jobSeeker.district ?? "",
    ).trim();

    const highestQualification = String(
      applicantSnapshot.highestQualification ??
        jobSeeker.highestQualification ??
        "",
    ).trim();

    if (!fullName) {
      return res.status(400).json({
        message: "Full name is required.",
      });
    }

    if (!phone) {
      return res.status(400).json({
        message: "Mobile number is required.",
      });
    }

    if (!email) {
      return res.status(400).json({
        message: "Email address is required.",
      });
    }

    if (!district) {
      return res.status(400).json({
        message: "District/location is required.",
      });
    }

    if (!highestQualification) {
      return res.status(400).json({
        message: "Highest qualification is required.",
      });
    }

    // ----------------------------------------------------------
    // BUILD APPLICANT SNAPSHOT
    // ----------------------------------------------------------

    const applicantSnapshotData = {
      fullName,
      phone,
      email,
      district,
      highestQualification,

      experienceYears:
        Number(
          applicantSnapshot.experienceYears ?? jobSeeker.experienceYears ?? 0,
        ) || 0,

      experience: Array.isArray(applicantSnapshot.experience)
        ? applicantSnapshot.experience
        : jobSeeker.experience || [],

      currentSalary:
        applicantSnapshot.currentSalary === "" ||
        applicantSnapshot.currentSalary === undefined ||
        applicantSnapshot.currentSalary === null
          ? (jobSeeker.currentSalary ?? null)
          : Number(applicantSnapshot.currentSalary),

      expectedSalary:
        applicantSnapshot.expectedSalary === "" ||
        applicantSnapshot.expectedSalary === undefined ||
        applicantSnapshot.expectedSalary === null
          ? (jobSeeker.expectedSalary ?? null)
          : applicantSnapshot.expectedSalary,

      skills: Array.isArray(applicantSnapshot.skills)
        ? applicantSnapshot.skills
        : jobSeeker.skills || [],

      resumeUrl: String(
        applicantSnapshot.resumeUrl ?? jobSeeker.resumeUrl ?? "",
      ).trim(),
    };

    // ----------------------------------------------------------
    // VALIDATE EMPLOYER QUESTIONS
    // ----------------------------------------------------------

    const submittedQuestions = Array.isArray(applicationQuestions)
      ? applicationQuestions
      : [];

    const normalizedQuestions = employerQuestions.map((question) => {
      const submitted = submittedQuestions.find(
        (item) => String(item.questionId) === String(question._id),
      );

      const answer = submitted?.answer;

      const isEmpty =
        answer === undefined ||
        answer === null ||
        answer === "" ||
        (Array.isArray(answer) && answer.length === 0);

      // Required question
      if (question.required && isEmpty) {
        throw new Error(`Please answer: ${question.question}`);
      }

      // Validate single choice
      if (!isEmpty && question.type === "single_choice") {
        if (!question.options.includes(answer)) {
          throw new Error(`Invalid answer for: ${question.question}`);
        }
      }

      // Validate multiple choice
      if (!isEmpty && question.type === "multiple_choice") {
        if (
          !Array.isArray(answer) ||
          answer.some((value) => !question.options.includes(value))
        ) {
          throw new Error(`Invalid answer for: ${question.question}`);
        }
      }

      // Validate yes/no
      if (!isEmpty && question.type === "yes_no") {
        if (!["Yes", "No"].includes(answer)) {
          throw new Error(`Invalid answer for: ${question.question}`);
        }
      }

      return {
        questionId: question._id,
        question: question.question,
        type: question.type,
        options: question.options || [],
        required: question.required || false,
        answer: answer ?? (question.type === "multiple_choice" ? [] : ""),
      };
    });

    // ----------------------------------------------------------
    // CREATE APPLICATION
    // ----------------------------------------------------------
    const application = await Application.create({
      job: job._id,
      jobSeeker: jobSeeker._id,
      recruiter: job.recruiter,

      applicantSnapshot: applicantSnapshotData,

      applicationQuestions: normalizedQuestions,
    });

    // ----------------------------------------------------------
    // RECRUITER EMAIL
    // ----------------------------------------------------------

    const recruiterData = await Recruiter.findById(job.recruiter).populate(
      "user",
    );

    const recruiterEmail = recruiterData?.user?.email;

    if (recruiterEmail) {
      await sendEmail({
        to: recruiterEmail,

        subject: "New Job Application - DharmaJobs",

        html: `
          <h3>New Application Received</h3>

          <p>A candidate has applied for your job:</p>

          <strong>${job.title}</strong>

          <br/><br/>

          <p>
            Candidate:
            <strong>${fullName}</strong>
          </p>

          <p>
            Login to DharmaJobs to review the candidate.
          </p>
        `,
      });
    }

    return res.status(201).json({
      message: "Application submitted successfully.",
      application,
    });
  } catch (error) {
    next(error);
  }
};

//All Applicants for a job into the table
export const getRecruiterApplications = async (req, res, next) => {
  try {
    const recruiter = req.recruiter;

    if (!recruiter) {
      return res.status(403).json({
        message: "Recruiter profile not found",
      });
    }

    // ---------------------------------------
    // PLAN ACCESS CHECK
    // ---------------------------------------

    const now = new Date();

    const hasActivePlan =
      recruiter.planExpiryDate && new Date(recruiter.planExpiryDate) > now;

    if (!hasActivePlan) {
      return res.status(403).json({
        message: "Your plan has expired. Please upgrade to view applicants.",
      });
    }

    const isBasicOrPro =
      recruiter.subscriptionPlan === "basic" ||
      recruiter.subscriptionPlan === "pro";

    const isPro = recruiter.subscriptionPlan === "pro";

    // ---------------------------------------
    // GET APPLICATIONS
    // ---------------------------------------

    const jobId = req.params.jobId;

    const applications = await Application.find({
      recruiter: recruiter._id,
      job: jobId,
    })
      .populate(
        "job",
        "title subject district salaryRange experienceRequired qualification createdAt",
      )
      .sort({ createdAt: -1 });

    const jobDetails = await JobDetails.findOne({
      job: jobId,
    }).lean();

    // ---------------------------------------
    // PLAN-BASED RESPONSE
    // ---------------------------------------

    const formattedApplications = applications.map((application) => {
      const snapshot = application.applicantSnapshot || {};

      // ---------------------------------------
      // COMMON RESPONSE
      // ---------------------------------------

      const baseResponse = {
        _id: application._id,
        status: application.status,
        createdAt: application.createdAt,

        recruiterActivity: application.recruiterActivity || {},

        job: application.job,
      };

      // ---------------------------------------
      // FREE TRIAL
      // ---------------------------------------

      if (!isBasicOrPro) {
        return {
          ...baseResponse,

          applicant: {
            name: snapshot.fullName || "",
            district: snapshot.district || "",
            phone: snapshot.phone || "",
          },
        };
      }

      // ---------------------------------------
      // BASIC
      // ---------------------------------------

      const applicant = {
        name: snapshot.fullName || "",
        email: snapshot.email || "",
        phone: snapshot.phone || "",
        district: snapshot.district || "",

        highestQualification: snapshot.highestQualification || "",

        experienceYears: snapshot.experienceYears ?? 0,

        experience: snapshot.experience || [],

        currentSalary: snapshot.currentSalary ?? null,

        expectedSalary: snapshot.expectedSalary ?? null,

        skills: snapshot.skills || [],

        resumeUrl: snapshot.resumeUrl || "",
      };

      // ---------------------------------------
      // PRO
      // ---------------------------------------

      if (isPro) {
        applicant.matchScore = application.matchScore ?? null;

        applicant.matchBreakdown = application.matchBreakdown || null;
      }

      return {
        ...baseResponse,

        applicant,

        // Candidate's answers to employer questions
        applicationQuestions: application.applicationQuestions || [],
      };
    });

    return res.status(200).json({
      total: formattedApplications.length,

      plan: {
        name: recruiter.subscriptionPlan,
        isBasicOrPro,
        isPro,
      },

      job: applications[0]?.job || null,

      jobDetails: jobDetails || null,

      applications: formattedApplications,
    });
  } catch (error) {
    next(error);
  }
};

export const updateApplicationStatus = async (req, res, next) => {
  try {
    const { applicationId } = req.params;
    const { status } = req.body;

    const application = await Application.findOne({
      _id: applicationId,
      recruiter: req.recruiter._id,
    });
    if (!application) {
      return res.status(404).json({ message: "Application not found" });
    }

    if (!["shortlisted", "rejected"].includes(status)) {
      return res.status(400).json({ message: "Invalid status" });
    }

    application.status = status;
    await application.save();

    res.json({
      message: "Application updated",
      application,
    });
  } catch (error) {
    next(error);
  }
};

//Single Applicant's Application for the job
export const getRecruiterApplication = async (req, res, next) => {
  try {
    const recruiter = req.recruiter;

    if (!recruiter) {
      return res.status(403).json({
        message: "Recruiter profile not found",
      });
    }

    const { applicationId } = req.params;

    const application = await Application.findOne({
      _id: applicationId,
      recruiter: recruiter._id,
    }).populate(
      "job",
      "title subject positionLevel category district salaryRange salaryType experienceRequired experienceType qualification instituteName createdAt expiryDate status",
    );

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    // ---------------------------------------
    // GET JOB DETAILS
    // ---------------------------------------

    const jobDetails = await JobDetails.findOne({
      job: application.job._id,
    }).lean();

    // ---------------------------------------
    // GET CURRENT JOB SEEKER PROFILE
    // ---------------------------------------

    const jobSeeker = await JobSeeker.findById(application.jobSeeker)
      .populate("user", "name email")
      .lean();

    if (!jobSeeker) {
      return res.status(404).json({
        message: "Job seeker profile not found",
      });
    }

    // ---------------------------------------
    // RECORD VIEWED AT
    // ---------------------------------------

    if (!application.recruiterActivity?.viewedAt) {
      application.set("recruiterActivity.viewedAt", new Date());

      await application.save();
    }

    // ---------------------------------------
    // RESPONSE
    // ---------------------------------------

    return res.status(200).json({
      application,
      job: application.job,
      jobDetails: jobDetails || null,

      applicantProfile: jobSeeker,
    });
  } catch (error) {
    next(error);
  }
};

export const proceedWithApplication = async (req, res, next) => {
  try {
    const recruiter = req.recruiter;

    if (!recruiter) {
      return res.status(403).json({
        message: "Recruiter profile not found",
      });
    }

    const { applicationId } = req.params;

    const application = await Application.findOne({
      _id: applicationId,
      recruiter: recruiter._id,
    });

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    // ---------------------------------------
    // RECORD PROCEED ACTION
    // ---------------------------------------

    if (!application.recruiterActivity) {
      application.recruiterActivity = {};
    }

    if (!application.recruiterActivity.proceededAt) {
      application.recruiterActivity.proceededAt = new Date();
    }

    // Make sure viewedAt is also recorded
    if (!application.recruiterActivity.viewedAt) {
      application.recruiterActivity.viewedAt = new Date();
    }

    await application.save();

    return res.status(200).json({
      message: "Application marked as proceeded",
      application,
    });
  } catch (error) {
    next(error);
  }
};

export const contactApplicant = async (req, res, next) => {
  try {
    const recruiter = req.recruiter;

    if (!recruiter) {
      return res.status(403).json({
        message: "Recruiter profile not found",
      });
    }

    const { applicationId } = req.params;
    const { method } = req.body;

    // ---------------------------------------
    // VALIDATE CONTACT METHOD
    // ---------------------------------------

    if (!["email", "mobile"].includes(method)) {
      return res.status(400).json({
        message: "Invalid contact method. Use email or mobile.",
      });
    }

    // ---------------------------------------
    // GET APPLICATION
    // ---------------------------------------

    const application = await Application.findOne({
      _id: applicationId,
      recruiter: recruiter._id,
    });

    if (!application) {
      return res.status(404).json({
        message: "Application not found",
      });
    }

    // ---------------------------------------
    // RECORD CONTACT ACTIVITY
    // ---------------------------------------

    if (!application.recruiterActivity) {
      application.recruiterActivity = {};
    }

    if (!application.recruiterActivity.contactHistory) {
      application.recruiterActivity.contactHistory = [];
    }

    const now = new Date();

    application.recruiterActivity.lastContactedAt = now;

    application.recruiterActivity.contactHistory.push({
      method,
      initiatedAt: now,
    });

    await application.save();

    return res.status(200).json({
      message: "Contact activity recorded",
      method,
      application,
    });
  } catch (error) {
    next(error);
  }
};
