import { JobSearch } from "./jobSearch.model.js";

export const trackJobSearch = async (
  jobSeekerId,
  keyword,
) => {
  try {
    if (!keyword || keyword.trim().length < 2) {
      return;
    }

    const normalizedKeyword = keyword
      .trim()
      .toLowerCase();

    await JobSearch.findOneAndUpdate(
      {
        jobSeeker: jobSeekerId,
        keyword: normalizedKeyword,
      },
      {
        $inc: {
          searchCount: 1,
        },

        $set: {
          lastSearchedAt: new Date(),
        },
      },
      {
        upsert: true,
        new: true,
      },
    );
  } catch (error) {
    console.error(
      "Failed to track job search:",
      error.message,
    );
  }
};