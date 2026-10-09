export const requireVerifiedRecruiter = (req, res, next) => {
  if (!req.recruiter) {
    return res.status(403).json({
      message: "Recruiter profile not found",
    });
  }

  if (req.recruiter.verificationStatus !== "verified") {
    return res.status(403).json({
      message: "Your profile is not verified yet",
    });
  }

  next();
};