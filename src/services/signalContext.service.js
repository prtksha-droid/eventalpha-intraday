import {
  getTechnicalIntervals
} from "../config/technicalIntervals.js";

import {
  getTechnicalContext
} from "./technicalContext.service.js";
import {
  getMarketMemory
} from "./marketMemory.service.js";

import {
  evaluateMarketMemoryEvidence
} from "./marketMemoryEvidence.service.js";

export async function getSignalContext({
  exchange,
  tradingSymbol
}) {
  if (!exchange) {
    throw new Error(
      "exchange is required"
    );
  }

  if (!tradingSymbol) {
    throw new Error(
      "tradingSymbol is required"
    );
  }

  const intervals =
    getTechnicalIntervals();

  const [
      technical,
      marketMemory
    ] = await Promise.all([
      getTechnicalContext({
        intervals,
        exchange,
        tradingSymbol
      }),

      getMarketMemory({
        exchange,
        tradingSymbol
      })
    ]);

const marketMemoryEvidence =
  evaluateMarketMemoryEvidence(
    marketMemory
  );

  return {
      exchange:
        exchange.toUpperCase(),

      tradingSymbol:
        tradingSymbol.toUpperCase(),

      technical,

      marketMemory:
        marketMemoryEvidence
    };
}