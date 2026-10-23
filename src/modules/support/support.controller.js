import { z } from "zod";
import { generateSupportReply } from "./support.service.js";

const chatSchema = z
  .object({
    message: z
      .string()
      .trim()
      .min(1, "Please enter a message.")
      .max(2000, "Message cannot exceed 2000 characters."),
  })
  .strict();

export const chatWithSupport = async (req, res) => {
  const validation = chatSchema.safeParse(req.body);

  if (!validation.success) {
    return res.status(400).json({
      message:
        validation.error.issues[0]?.message ||
        "Please provide a valid message.",
    });
  }

  try {
    const reply = await generateSupportReply({
      message: validation.data.message,
      user: req.user ? { role: req.user.role } : null,
    });

    return res.status(200).json({ reply });
  } catch (error) {
    console.error("DharmaJobs support error:", {
      name: error.name,
      message: error.message,
      status: error.status || error.statusCode || error.code,
      details: error.errorDetails,
    });

    return res.status(503).json({
      message:
        "DharmaJobs Support is temporarily unavailable. Please try again later.",
    });
  }
};
