import { Instrument } from "../models/Instrument.js";

export async function getIntradayMarketListings() {
  return Instrument.find({
    isActive: true,
    isIntraday: true,
    isin: {
      $regex: /^INE/
    }
  })
    .select({
      exchange: 1,
      exchangeToken: 1,
      tradingSymbol: 1,
      isin: 1,
      series: 1
    })
    .sort({
      exchange: 1,
      tradingSymbol: 1
    })
    .lean();
}