import mongoose from "mongoose";

const entitySchema = new mongoose.Schema(
  {
    type: String,
    value: String,
    normalizedValue: String,
    confidence: Number,
  },
  { _id: false }
);

const newsEventSchema = new mongoose.Schema(
  {
    eventKey: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    eventType: {
      type: String,
      index: true,
    },

    eventSubtype: {
      type: String,
      index: true,
    },

    headline: {
      type: String,
      required: true,
    },

    summary: {
      type: String,
    },

    occurredAt: {
      type: Date,
      index: true,
    },

    firstPublishedAt: {
      type: Date,
      index: true,
    },

    latestPublishedAt: {
      type: Date,
      index: true,
    },

    sourceNewsIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "RawNews",
      },
    ],

    entities: [entitySchema],

    themes: [String],

    geography: [String],

    direction: {
      type: String,
    },

    confidence: {
      type: Number,
    },

    extractionMethod: {
      type: String,
    },

    processingVersion: {
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

newsEventSchema.index({
  eventType: 1,
  firstPublishedAt: -1,
});

newsEventSchema.index({
  "entities.normalizedValue": 1,
  firstPublishedAt: -1,
});

const NewsEvent =
  mongoose.models.NewsEvent ||
  mongoose.model("NewsEvent", newsEventSchema);

export default NewsEvent;