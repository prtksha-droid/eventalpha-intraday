import mongoose from "mongoose";

const instrumentSchema = new mongoose.Schema(
  {
    exchange: {
      type: String,
      required: true,
      index: true
    },

    exchangeToken: {
      type: String,
      required: true
    },

    tradingSymbol: {
      type: String,
      required: true,
      index: true
    },

    growwSymbol: {
      type: String,
      index: true
    },

    name: {
      type: String,
      index: true
    },

    instrumentType: String,

    segment: {
      type: String,
      required: true,
      index: true
    },

    series: String,

    isin: {
      type: String,
      index: true
    },

    buyAllowed: Boolean,
    sellAllowed: Boolean,
    
    isIntraday: {
      type: Boolean,
      default: false,
      index: true
    },

    isActive: {
      type: Boolean,
      default: true,
      index: true
    },

    source: {
      type: String,
      default: "GROWW"
    },

    lastSyncedAt: Date
  },
  {
    timestamps: true
  }
);

instrumentSchema.index(
  {
    exchange: 1,
    tradingSymbol: 1,
    segment: 1
  },
  {
    unique: true
  }
);

export const Instrument = mongoose.model("Instrument", instrumentSchema);