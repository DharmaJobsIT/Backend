import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { User } from "../users/user.model.js";
import { JobSeeker } from "../jobseekers/jobseeker.model.js";
import { Recruiter } from "../recruiters/recruiter.model.js";
import { sendOTPEmail } from "./otp.service.js";
import { sendEmail } from "../../services/email.service.js";
import { redisClient } from "../../config/redis.js";
import { randomUUID } from "crypto";
import crypto from "crypto";

const generateToken = (user) => {
  return jwt.sign(
    {
      id: user._id,
      role: user.role,
    },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN,
    },
  );
};

export const adminLogin = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user || user.role !== "admin") {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const googleLoginCallback = async (req, res, next) => {
  try {
    const user = req.user;

    if (!user) {
      return res.status(401).json({
        message: "Google authentication failed",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Create / find JobSeeker profile
    |--------------------------------------------------------------------------
    */

    if (user.role === "jobseeker") {
      let jobSeeker = await JobSeeker.findOne({
        user: user._id,
      });

      if (!jobSeeker) {
        await JobSeeker.create({
          user: user._id,
          fullName: user.name,
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Create / find Recruiter profile
    |--------------------------------------------------------------------------
    */

    if (user.role === "recruiter") {
      let recruiter = await Recruiter.findOne({
        user: user._id,
      });

      if (!recruiter) {
        await Recruiter.create({
          user: user._id,
          isVerified: false,
          subscriptionPlan: "free_trial",
          jobPostLimit: 1,
          profileCompleted: false,
          verificationStatus: "submitted",
          verificationTimeline: [
            {
              status: "submitted",
              date: new Date(),
            },
          ],
        });
      }
    }

    /*
    |--------------------------------------------------------------------------
    | Generate normal DharmaJobs JWT
    |--------------------------------------------------------------------------
    */

    const token = generateToken(user);

    /*
    |--------------------------------------------------------------------------
    | Generate one-time OAuth exchange code
    |--------------------------------------------------------------------------
    */

    const code = randomUUID();

    /*
    |--------------------------------------------------------------------------
    | Store authentication result temporarily in Redis
    |--------------------------------------------------------------------------
    |
    | The code expires after 60 seconds and is deleted after use.
    |
    */

    await redisClient.setEx(
      `google-auth:${code}`,
      60,
      JSON.stringify({
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
        },
      }),
    );

    /*
    |--------------------------------------------------------------------------
    | Redirect to frontend
    |--------------------------------------------------------------------------
    */

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      return res.status(500).json({
        message: "FRONTEND_URL is not configured",
      });
    }

    return res.redirect(
      `${frontendUrl}/auth?google_code=${encodeURIComponent(code)}`,
    );
  } catch (error) {
    next(error);
  }
};
export const exchangeGoogleCode = async (req, res, next) => {
  try {
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        message: "Google authentication code is required",
      });
    }

    const redisKey = `google-auth:${code}`;

    const storedData = await redisClient.get(redisKey);

    if (!storedData) {
      return res.status(401).json({
        message: "Invalid or expired Google authentication code",
      });
    }

    /*
    |--------------------------------------------------------------------------
    | Delete immediately
    |--------------------------------------------------------------------------
    | This makes the code one-time use.
    |--------------------------------------------------------------------------
    */

    await redisClient.del(redisKey);

    const authData = JSON.parse(storedData);

    return res.status(200).json({
      message: "Google login successful",
      token: authData.token,
      user: authData.user,
    });
  } catch (error) {
    next(error);
  }
};

export const loginUser = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).select("+password");

    if (!user) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN },
    );

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const sendOTP = async (req, res, next) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({
        message: "Email is required",
      });
    }

    const normalizedEmail = email.trim().toLowerCase();

    const otp = Math.floor(100000 + Math.random() * 900000).toString();

    await redisClient.setEx(`otp:${normalizedEmail}`, 600, otp);

    await sendOTPEmail(normalizedEmail, otp);

    return res.status(200).json({
      message: "OTP sent successfully to your email",
    });
  } catch (error) {
    console.error("Send OTP error:", error);
    next(error);
  }
};

export const verifyOTPAndRegister = async (req, res) => {
  try {
    const { name, email, password, role, otp } = req.body;

    const normalizedEmail = email.trim().toLowerCase();

    const storedOTP = await redisClient.get(`otp:${normalizedEmail}`);

    if (!storedOTP || storedOTP !== otp) {
      return res.status(400).json({
        message: "Invalid or expired OTP",
      });
    }

    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        message: "Email already registered. Please login.",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email: normalizedEmail,
      password: hashedPassword,
      role,
    });

    await redisClient.del(`otp:${normalizedEmail}`);

    const token = jwt.sign(
      {
        id: user._id,
        role: user.role,
      },
      process.env.JWT_SECRET,
      {
        expiresIn: process.env.JWT_EXPIRES_IN,
      },
    );

    res.status(201).json({
      token,
      user,
    });
  } catch (error) {
    res.status(500).json({
      message: "Registration failed",
    });
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        message: "Please provide your email address.",
      });
    }

    // Check whether an active, locally authenticated account exists.
    const user = await User.findOne({
      email,
      isActive: true,
      provider: "local",
    }).select("+passwordResetToken +passwordResetExpires");

    // Use the same response whether the account exists or not.
    const responseMessage =
      "If an eligible account exists for this email, a password reset link will be sent.";

    if (!user) {
      return res.status(200).json({
        message: responseMessage,
      });
    }

    // Generate a cryptographically secure, single-use token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the token hash in MongoDB.
    user.passwordResetToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    // Reset link expires after 15 minutes.
    user.passwordResetExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL?.replace(/\/+$/, "");

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured.");
    }

    const resetUrl =
      `${frontendUrl}/reset-password?token=${encodeURIComponent(resetToken)}`;

    await sendEmail({
      to: user.email,
      subject: "DharmaJobs - Reset Your Password",
      html: `
        <h2 style="color: #2563eb;">Reset Your Password</h2>

        <p>Hello ${escapeHtml(user.name)},</p>

        <p>
          We received a request to reset your DharmaJobs password.
          Click the button below to choose a new password.
        </p>

        <div style="text-align: center; margin: 28px 0;">
          <a
            href="${resetUrl}"
            style="
              display: inline-block;
              padding: 14px 26px;
              background: #2563eb;
              color: #ffffff;
              text-decoration: none;
              border-radius: 8px;
              font-weight: bold;
            "
          >
            Reset Password
          </a>
        </div>

        <p>
          This link expires in <strong>15 minutes</strong>
          and can be used only once.
        </p>

        <p>If you didn't request this, you can safely ignore this email.</p>

        <p style="color: #6b7280; font-size: 12px;">
          For your security, never share this link with anyone.
        </p>
      `,
    });

    return res.status(200).json({
      message: responseMessage,
    });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { token, newPassword, confirmPassword } = req.body;

    if (!token || !newPassword || !confirmPassword) {
      return res.status(400).json({
        message: "Token, new password, and confirmation are required.",
      });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({
        message: "Password must be at least 8 characters long.",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        message: "Passwords do not match.",
      });
    }

    // Hash the token to match the value stored in MongoDB.
    const hashedToken = crypto.createHash("sha256").update(token).digest("hex");

    const user = await User.findOne({
      passwordResetToken: hashedToken,
      passwordResetExpires: { $gt: new Date() },
      provider: "local",
      isActive: true,
    }).select("+passwordResetToken +passwordResetExpires");

    if (!user) {
      return res.status(400).json({
        message:
          "This password reset link is invalid or has expired. Please request a new one.",
      });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(newPassword, salt);

    // Invalidate the token so it cannot be reused.
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save();

    return res.status(200).json({
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    next(error);
  }
};

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (character) => {
    const entities = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };

    return entities[character];
  });
}
