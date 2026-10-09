// middleware/attachRecruiter.js

import { Recruiter } from "../modules/recruiters/recruiter.model.js";

export const attachRecruiter = async (req, res, next) => {
  try {
    const recruiter = await Recruiter.findOne({ user: req.user.id });

    if (!recruiter) {
      return res.status(403).json({
        message: "Recruiter profile not found",
      });
    }

    req.recruiter = recruiter;
    next();
  } catch (err) {
    next(err);
  }
};

