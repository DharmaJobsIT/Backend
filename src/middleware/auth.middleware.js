import jwt from "jsonwebtoken";
import { User } from "../modules/users/user.model.js";
import { Recruiter } from "../modules/recruiters/recruiter.model.js";

export const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization?.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      return res.status(401).json({ message: "Not authorized" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    const user = await User.findById(decoded.id).select("-password");

    if (!user) {
      return res.status(401).json({ message: "User not found" });
    }

    // 🔥 IMPORTANT
    req.user = user;
    req.userId = user._id; // safer access

    next();
  } catch (error) {
    return res.status(401).json({ message: "Invalid token" });
  }
};

export const optionalProtect = async (req, res, next) => {
  try {
    let token;

    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer")
    ) {
      token = req.headers.authorization.split(" ")[1];
    }

    // No token → guest user
    if (!token) {
      return next();
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);

      const user = await User.findById(decoded.id).select("-password");

      if (user) {
        req.user = user;
        req.userId = user._id;
      } 
    } catch (error) {
      // Invalid token should not block public jobs
      console.log("Optional authentication failed:", error.message);
    }

    next();
  } catch (error) {
    next();
  }
};

export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: "Access denied" });
    }
    next();
  };
};

export const requireVerifiedRecruiter = async (req, res, next) => {
  try {
    if (req.user.role !== "recruiter") {
      return res.status(403).json({ message: "Only recruiters allowed" });
    }

    const recruiter = await Recruiter.findOne({ user: req.user._id });

    if (!recruiter) {
      return res.status(404).json({ message: "Recruiter profile not found" });
    }

    if (!recruiter.isVerified) {
      return res.status(403).json({
        message: "Your account is pending admin verification",
      });
    }
    req.recruiter = recruiter;
    req.recruiterProfile = recruiter;

    next();
  } catch (error) {
    next(error);
  }
};
