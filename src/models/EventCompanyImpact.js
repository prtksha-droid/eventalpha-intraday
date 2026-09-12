import mongoose from "mongoose";

const eventCompanyImpactSchema =
  new mongoose.Schema(
    {
      eventId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "NewsEvent",
        required: true,
        index: true,
      },

      companyId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Company",
        index: true,
      },

      symbol: {
        type: String,
        required: true,
        index: true,
      },

      exchange: {
        type: String,
        index: true,
      },

      relationshipType: {
        type: String,
      },

      direction: {
        type: String,
        index: true,
      },

      impactStrength: {
        type: Number,
      },

      confidence: {
        type: Number,
      },

      relevance: {
        type: Number,
      },

      expectedHorizon: {
        type: String,
      },

      reasoning: [
        {
          type: String,
        },
      ],

      evidence: [
        {
          type: mongoose.Schema.Types.Mixed,
        },
      ],

      metadata: {
        type: mongoose.Schema.Types.Mixed,
      },
    },
    {
      timestamps: true,
    }
  );

eventCompanyImpactSchema.index(
  {
    eventId: 1,
    symbol: 1,
    exchange: 1,
  },
  {
    unique: true,
  }
);

eventCompanyImpactSchema.index({
  symbol: 1,
  createdAt: -1,
});

export default mongoose.model(
  "EventCompanyImpact",
  eventCompanyImpactSchema
);