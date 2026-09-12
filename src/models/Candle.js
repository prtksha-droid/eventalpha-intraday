import mongoose from "mongoose";

const candleSchema = new mongoose.Schema(
  {
    exchange: {
      type: String,
      required: true,
      index: true
    },

    tradingSymbol: {
      type: String,
      required: true,
      index: true
    },

    isin: {
      type: String,
      index: true
    },

    interval: {
      type: String,
      required: true,
      index: true
    },

    open: {
      type: Number,
      required: true
    },

    high: {
      type: Number,
      required: true
    },

    low: {
      type: Number,
      required: true
    },

    close: {
      type: Number,
      required: true
    },
    
    volume: {
      type: Number
    },
    
    startTimestamp: {
      type: Number,
      required: true,
      index: true
    },

    endTimestamp: {
      type: Number,
      required: true
    },

    source: {
      type: String,
      index: true
    },
    
    lastTickTimestamp: Number
  },
  {
    timestamps: true
  }
);

candleSchema.index(
  {
    exchange: 1,
    tradingSymbol: 1,
    interval: 1,
    startTimestamp: 1
  },
  {
    unique: true
  }
);

export const Candle = mongoose.model(
  "Candle",
  candleSchema
);