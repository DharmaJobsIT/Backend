import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.resolve(__dirname, "../../assets/dharmajobs-logo.png");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendOTPEmail = async (email, otp) => {
  const mailOptions = {
    from: `"DharmaJobs" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "DharmaJobs - Email Verification OTP",

    text: `Your DharmaJobs verification OTP is ${otp}. It will expire in 10 minutes.`,

    attachments: [
      {
        filename: "dharmajobs-logo.png",
        path: logoPath,
        cid: "dharmajobs-logo",
      },
    ],

    html: `
      <div style="
        font-family: Arial, sans-serif;
        max-width: 600px;
        margin: auto;
        padding: 30px;
        border: 1px solid #e5e7eb;
        border-radius: 12px;
      ">
        <div style="text-align: center; margin-bottom: 24px;">
          <img
            src="cid:dharmajobs-logo"
            alt="DharmaJobs Logo"
            style="max-width: 180px; max-height: 90px; width: auto; height: auto; object-fit: contain;"
          />
        </div>

        <h2 style="color: #2563eb;">
          DharmaJobs Email Verification
        </h2>

        <p>Thank you for registering with DharmaJobs.</p>

        <p>Your verification OTP is:</p>

        <div style="
          font-size: 32px;
          font-weight: bold;
          letter-spacing: 8px;
          text-align: center;
          padding: 20px;
          background: #f3f4f6;
          border-radius: 8px;
          margin: 20px 0;
        ">
          ${otp}
        </div>

        <p>
          This OTP will expire in <strong>10 minutes</strong>.
        </p>

        <p style="color: #6b7280;">
          If you did not request this OTP, you can safely ignore this email.
        </p>

        <hr />

        <p style="color: #6b7280; font-size: 12px;">
          © ${new Date().getFullYear()} DharmaJobs. All rights reserved.
        </p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
};
