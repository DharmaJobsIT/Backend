import mongoose from "mongoose";

const searchHistorySchema =
  new mongoose.Schema(
    {
      jobSeeker: {
        type:
          mongoose.Schema.Types.ObjectId,

        ref: "JobSeeker",

        required: true,

        index: true,
      },

      keyword: {
        type: String,

        required: true,

        trim: true,

        lowercase: true,
      },

      count: {
        type: Number,

        default: 1,
      },

      lastSearchedAt: {
        type: Date,

        default: Date.now,
      },
    },
    {
      timestamps: true,
    }
  );

/*
 * One keyword per jobseeker
 */

searchHistorySchema.index(
  {
    jobSeeker: 1,
    keyword: 1,
  },
  {
    unique: true,
  }
);

export const SearchHistory =
  mongoose.model(
    "SearchHistory",
    searchHistorySchema
  );