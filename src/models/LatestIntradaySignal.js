import mongoose from "mongoose";

const latestIntradaySignalSchema =
  new mongoose.Schema(
    {
      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        required: true,
        unique: true,
        index: true
      },

      isin: {
        type: String,
        required: true,
        index: true
      },

      decision: {
        type: String,
        required: true,
        index: true
      },

      actionable: {
        type: Boolean,
        required: true,
        index: true
      },

      reason: {
        type: String,
        default: null
      },

      listingCount: {
        type: Number,
        default: 0
      },

      actionableListingCount: {
        type: Number,
        default: 0
      },

      agreement: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },

      policy: {
        type: mongoose.Schema.Types.Mixed,
        default: null
      },

      signals: {
        type: [mongoose.Schema.Types.Mixed],
        default: []
      },

      evaluatedAt: {
        type: Date,
        required: true,
        index: true
      }
    },
    {
      timestamps: true
    }
  );

latestIntradaySignalSchema.index({
  decision: 1,
  evaluatedAt: -1
});

export const LatestIntradaySignal =
  mongoose.model(
    "LatestIntradaySignal",
    latestIntradaySignalSchema
  );