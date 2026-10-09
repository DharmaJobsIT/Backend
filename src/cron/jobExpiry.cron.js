import cron from "node-cron";
import { expireOldJobs } from "../services/jobExpiry.service.js";

export const startJobExpiryCron = () => {

  cron.schedule("0 0 * * *", async () => {

    console.log("Running job expiry check...");

    await expireOldJobs();

  });

};