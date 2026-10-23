import nodemailer from "nodemailer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const logoPath = path.resolve(__dirname, "../assets/dharmajobs-logo.png");

export const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

export const sendEmail = async ({ to, subject, html }) => {
  try {
    return await transporter.sendMail({
      from: `"DharmaJobs" <${process.env.EMAIL_USER}>`,
      to,
      subject,

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
          margin: 0 auto;
          padding: 24px;
          border: 1px solid #e5e7eb;
          border-radius: 12px;
          color: #1f2937;
        ">
          <div style="text-align: center; margin-bottom: 24px;">
            <img
              src="cid:dharmajobs-logo"
              alt="DharmaJobs Logo"
              style="
                max-width: 180px;
                max-height: 90px;
                width: auto;
                height: auto;
                object-fit: contain;
              "
            />
          </div>

          ${html}

          <hr style="
            border: none;
            border-top: 1px solid #e5e7eb;
            margin-top: 28px;
          " />

          <p style="
            color: #6b7280;
            font-size: 12px;
            text-align: center;
          ">
            © ${new Date().getFullYear()} DharmaJobs. All rights reserved.
          </p>
        </div>
      `,
    });
  } catch (error) {
    console.error("Email error:", error);
    throw error;
  }
};
