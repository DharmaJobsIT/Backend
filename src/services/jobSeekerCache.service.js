import { redisClient } from "../config/redis.js";

const PROFILE_CACHE_TTL = 1800; // 30 minutes

const getProfileCacheKey = (jobSeekerId) => {
  return `jobseeker:profile:${jobSeekerId}`;
};

export const getCachedJobSeekerProfile = async (jobSeekerId) => {
  try {
    if (!redisClient?.isReady) {
      return null;
    }

    const cachedProfile = await redisClient.get(
      getProfileCacheKey(jobSeekerId)
    );

    if (!cachedProfile) {
      return null;
    }

    return JSON.parse(cachedProfile);
  } catch (error) {
    console.warn(
      "Failed to read JobSeeker profile from Redis:",
      error.message
    );

    return null;
  }
};

export const cacheJobSeekerProfile = async (
  jobSeekerId,
  profile
) => {
  try {
    if (!redisClient?.isReady) {
      return;
    }

    await redisClient.set(
      getProfileCacheKey(jobSeekerId),
      JSON.stringify(profile),
      {
        EX: PROFILE_CACHE_TTL,
      }
    );
  } catch (error) {
    console.warn(
      "Failed to cache JobSeeker profile:",
      error.message
    );
  }
};

export const invalidateJobSeekerProfileCache = async (
  jobSeekerId
) => {
  try {
    if (!redisClient?.isReady) {
      return;
    }

    await redisClient.del(
      getProfileCacheKey(jobSeekerId)
    );
  } catch (error) {
    console.warn(
      "Failed to invalidate JobSeeker profile cache:",
      error.message
    );
  }
};