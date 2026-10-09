import {
  PutObjectCommand,
  GetObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { s3 } from "../config/s3.js";
import { JobSeeker } from "../modules/jobseekers/jobseeker.model.js";

const BUCKET_NAME = process.env.AWS_BUCKET_NAME;

/**
 * Creates a safe name for use inside an S3 key.
 *
 * Example:
 * "Rahul Kumar" -> "Rahul-Kumar"
 */
const sanitizeName = (name = "jobseeker") => {
  return name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9-_]/g, "");
};

/**
 * Creates a timestamp suitable for S3 filenames.
 *
 * Example:
 * 20261009125030
 */
const getTimestamp = () => {
  return new Date()
    .toISOString()
    .replace(/[-:T]/g, "")
    .split(".")[0];
};

/**
 * Upload JobSeeker resume
 *
 * S3 structure:
 * jobseekers/resumes/<jobSeekerId>-<name>/
 *   resume1-timestamp.pdf
 *   resume2-timestamp.pdf
 *   resume3-timestamp.pdf
 */
export const uploadResumeToS3 = async (file, jobSeekerId) => {
  const jobSeeker = await JobSeeker.findById(jobSeekerId).select(
    "fullName"
  );

  if (!jobSeeker) {
    throw new Error("Job seeker not found");
  }

  const safeName = sanitizeName(jobSeeker.fullName);

  const resumePrefix = `jobseekers/resumes/${jobSeekerId}-${safeName}/`;

  // Find existing resumes for this JobSeeker
  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: resumePrefix,
  });

  const listResult = await s3.send(listCommand);

  const existingResumes = listResult.Contents || [];

  // Find the highest existing resume number
  let highestResumeNumber = 0;

  existingResumes.forEach((object) => {
    const key = object.Key || "";

    const match = key.match(/resume(\d+)-/);

    if (match) {
      const number = Number(match[1]);

      if (number > highestResumeNumber) {
        highestResumeNumber = number;
      }
    }
  });

  const nextResumeNumber = highestResumeNumber + 1;

  const timestamp = getTimestamp();

  const fileExtension = file.originalname
    .split(".")
    .pop()
    .toLowerCase();

  const fileKey = `${resumePrefix}resume${nextResumeNumber}-${timestamp}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return {
    key: fileKey,
    // url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
    resumeNumber: nextResumeNumber,
  };
};

/**
 * Upload / replace JobSeeker profile photo
 *
 * S3 structure:
 * jobseekers/profile-photo/
 *   <jobSeekerId>-timestamp.jpg
 *
 * Only ONE profile photo is kept for each JobSeeker.
 */
export const uploadProfilePhotoToS3 = async (file, jobSeekerId) => {
  const profilePhotoPrefix = `jobseekers/profile-photo/`;
  const jobSeekerPrefix = `${profilePhotoPrefix}${jobSeekerId}-`;

  // Find existing profile photos for this JobSeeker
  const listCommand = new ListObjectsV2Command({
    Bucket: BUCKET_NAME,
    Prefix: jobSeekerPrefix,
  });

  const listResult = await s3.send(listCommand);

  const existingPhotos = listResult.Contents || [];

  // Delete old profile photo(s)
  for (const object of existingPhotos) {
    if (!object.Key) {
      continue;
    }

    const deleteCommand = new DeleteObjectCommand({
      Bucket: BUCKET_NAME,
      Key: object.Key,
    });

    await s3.send(deleteCommand);
  }

  const timestamp = getTimestamp();

  const fileExtension = file.originalname
    .split(".")
    .pop()
    .toLowerCase();

  const fileKey = `${profilePhotoPrefix}${jobSeekerId}-${timestamp}.${fileExtension}`;

  const command = new PutObjectCommand({
    Bucket: BUCKET_NAME,
    Key: fileKey,
    Body: file.buffer,
    ContentType: file.mimetype,
  });

  await s3.send(command);

  return {
    key: fileKey,
    // url: `https://${BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileKey}`,
  };
};

/**
 * Generate a temporary signed URL for a resume
 */
export const generateSignedUrl = async (key) => {
    const command = new GetObjectCommand({
    Bucket: BUCKET_NAME,
    Key: key,
  });

  const url = await getSignedUrl(s3, command, {
    expiresIn: 300, // 5 minutes
  });

  return url;
};
