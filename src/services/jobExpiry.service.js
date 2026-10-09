import { Job } from "../modules/jobs/job.model.js";

export const expireOldJobs = async () => {
  try {

    const now = new Date();

    const expiredJobs = await Job.updateMany(
      {
        expiryDate: { $lt: now },
        status: "active",
      },
      {
        $set: { status: "expired", isActive: false },
      }
    );

    console.log(`Expired ${expiredJobs.modifiedCount} jobs`);

  } catch (error) {
    console.error("Job expiry error:", error);
  }
};