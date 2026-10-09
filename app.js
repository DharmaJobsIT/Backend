import express from "express";
import "dotenv/config";
import cors from "cors";

import { connectDB } from "./src/config/db.js";
import { connectRedis } from "./src/config/redis.js";
import { applySecurityMiddleware } from "./src/middleware/security.js";
import { errorHandler } from "./src/middleware/errorHandler.js";
import { seedAdmin } from "./src/utils/seedAdmin.js";
import authRoutes from "./src/modules/auth/auth.route.js";
import passport from "passport";
import "./src/config/passport.js";
import { startJobExpiryCron } from "./src/cron/jobExpiry.cron.js";
import recruiterRoutes from "./src/modules/recruiters/recruiter.route.js";
import subscriptionRoutes from "./src/modules/subscriptions/subscription.route.js";
import jobRoutes from "./src/modules/jobs/job.route.js";
import jobDetailsRoutes from "./src/modules/jobs/jobDetails.route.js";
import jobSeekerRoutes from "./src/modules/jobseekers/jobseeker.route.js";
import savedJobRoutes from "./src/modules/jobseekers/savedJobs.route.js";
import applicationRoutes from "./src/modules/applications/application.route.js";
import adminRoutes from "./src/modules/admin/admin.route.js";

//dotenv.config();

const app = express();

// Connect Services
connectDB().then(() => {
  startJobExpiryCron();
  seedAdmin();
});
connectRedis();

// Middlewares
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);
app.use(express.json());
applySecurityMiddleware(app);
app.use(passport.initialize());

app.use("/api/auth", authRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/recruiters", recruiterRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/jobs", jobRoutes);
app.use("/api/jobs", jobDetailsRoutes);

app.use("/api/jobseekers", jobSeekerRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/saved-jobs", savedJobRoutes);
// Health Check Route
app.get("/", (req, res) => {
  res.json({ message: "DharmaJobs Backend Running 🚀" });
});

// Error Handler
app.use(errorHandler);

const PORT = process.env.PORT || 5001;

app.use((req, res, next) => {
  const error = new Error(`Cannot ${req.method} ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
