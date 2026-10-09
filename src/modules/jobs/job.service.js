// job.service.js
import { Job } from "./job.model.js";
import { JobDetails } from "./jobDetails.js";

export const syncExpiredJobs = async () => {
  await Job.updateMany(
    {
      status: "active",
      expiryDate: { $lt: new Date() },
    },
    {
      $set: {
        status: "expired",
      },
    }
  );
};

export const createOrUpdateJobDetails = async (jobId, data) => {
  const job = await Job.findById(jobId);

  if (!job) {
    throw new Error("Job not found");
  }

  const jobDetails = await JobDetails.findOneAndUpdate(
    { job: jobId },
    {
      ...data,
      job: jobId,
    },
    {
      new: true,
      upsert: true,
      runValidators: true,
      setDefaultsOnInsert: true,
    }
  );

  return jobDetails;
};

export const getJobDetailsByJobId = async (jobId) => {
  return await JobDetails.findOne({
    job: jobId,
  });
};