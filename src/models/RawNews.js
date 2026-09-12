import mongoose from "mongoose";

const rawNewsSchema = new mongoose.Schema(
  {
    source: {
      type: String,
      required: true,
      index: true,
    },

    sourceType: {
      type: String,
      index: true,
    },

    externalId: {
      type: String,
      index: true,
    },

    url: {
      type: String,
    },

    title: {
      type: String,
      required: true,
    },

    description: {
      type: String,
    },

    content: {
      type: String,
    },

    author: {
      type: String,
    },

    publishedAt: {
      type: Date,
      required: true,
      index: true,
    },

    receivedAt: {
      type: Date,
      default: Date.now,
      index: true,
    },

    language: {
      type: String,
    },

    fingerprint: {
      type: String,
      required: true,
      index: true,
    },

    normalizedText: {
      type: String,
    },

    processingStatus: {
      type: String,
      default: "PENDING",
      index: true,
    },

    processingError: {
      type: String,
    },

    metadata: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

rawNewsSchema.index(
  {
    source: 1,
    externalId: 1,
  },
  {
    unique: true,
    sparse: true,
  }
);

rawNewsSchema.index({
  publishedAt: -1,
  processingStatus: 1,
});

rawNewsSchema.index({
  fingerprint: 1,
  publishedAt: -1,
});

const RawNews =
  mongoose.models.RawNews ||
  mongoose.model("RawNews", rawNewsSchema);

export default RawNews;