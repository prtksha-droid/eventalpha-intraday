import mongoose from "mongoose";

const listingSchema = new mongoose.Schema(
  {
    exchange: {
      type: String,
      required: true
    },

    tradingSymbol: {
      type: String,
      required: true
    },

    exchangeToken: String,

    series: String,

    buyAllowed: Boolean,
    sellAllowed: Boolean,

    isIntraday: Boolean
  },
  {
    _id: false
  }
);

const companySchema = new mongoose.Schema(
  {
    isin: {
      type: String,
      required: true,
      unique: true,
      index: true
    },

    name: {
      type: String,
      required: true,
      index: true
    },

    aliases: {
      type: [String],
      default: []
    },

    listings: {
      type: [listingSchema],
      default: []
    },

    sector: String,

    industry: String,

    marketCap: Number,

    website: String,

    classification: {
      type: String,
      default: "UNCLASSIFIED",
      index: true
    },

    intradayEligible: {
      type: Boolean,
      default: false,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    classificationEvidence: {
      type: [String],
      default: []
    },

    lastSyncedAt: Date
  },
  {
    timestamps: true
  }
);

export const Company = mongoose.model("Company", companySchema);