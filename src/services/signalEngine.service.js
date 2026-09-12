import {
  getSignalEngineConfig
} from "../config/signalEngine.js";

import {
  getSignalContext
} from "./signalContext.service.js";

import {
  evaluateTechnicalEvidence
} from "./technicalEvidence.service.js";

import {
  evaluateSignalConfidence
} from "./signalConfidence.service.js";

import {
  evaluateRisk
} from "./riskEngine.service.js";

import {
  buildTradePlan
} from "./tradePlan.service.js";


export async function evaluateSignal({
  exchange,
  tradingSymbol
}) {
  const config =
    getSignalEngineConfig();

  const signalContext =
    await getSignalContext({
      exchange,
      tradingSymbol
    });

  const technicalEvidence =
    evaluateTechnicalEvidence(
      signalContext.technical
    );

  const {
    readyIntervals,
    averageScore
  } = technicalEvidence.aggregate;


  let decision;
  let reason;


  if (
    readyIntervals <
    config.minimumReadyIntervals
  ) {
    decision = "PENDING";

    reason =
      "Insufficient ready technical intervals";
  } else if (
    averageScore >=
    config.thresholds.buy
  ) {
    decision = "BUY";

    reason =
      "Technical score reached buy threshold";
  } else if (
    averageScore >=
    config.thresholds.watch
  ) {
    decision = "WATCH";

    reason =
      "Technical score reached watch threshold";
  } else {
    decision = "AVOID";

    reason =
      "Technical score below watch threshold";
  }


  const actionable =
    readyIntervals >=
    config.minimumReadyIntervals;


  const marketMemory =
    signalContext.marketMemory;


  const confidence =
    evaluateSignalConfidence({
      technicalEvidence,
      marketMemory,

      configuredIntervals:
        config.intervals,

      technicalDecision:
        decision,

      confidenceConfig:
        config.confidence
    });


  const risk =
    evaluateRisk({
      technicalEvidence
    });


  let historicalConfirmation =
    "UNAVAILABLE";


  if (
    marketMemory?.ready === true
  ) {
    if (
      decision === "BUY" &&
      marketMemory.direction === "BULLISH"
    ) {
      historicalConfirmation =
        "CONFIRMED";
    } else if (
      decision === "BUY" &&
      marketMemory.direction === "BEARISH"
    ) {
      historicalConfirmation =
        "CONFLICT";
    } else if (
      decision === "WATCH" &&
      marketMemory.direction === "BULLISH"
    ) {
      historicalConfirmation =
        "SUPPORTIVE";
    } else if (
      decision === "WATCH" &&
      marketMemory.direction === "BEARISH"
    ) {
      historicalConfirmation =
        "CONFLICT";
    } else if (
      marketMemory.direction === "MIXED" ||
      marketMemory.direction === "NEUTRAL"
    ) {
      historicalConfirmation =
        "MIXED";
    } else {
      historicalConfirmation =
        "UNCONFIRMED";
    }
  }


  /*
   * Build execution plan after the technical
   * decision has been determined.
   *
   * BUY:
   *   entry / SL / targets / timing
   *
   * WATCH / AVOID / PENDING:
   *   tradePlan.available = false
   */
  const tradePlan =
    await buildTradePlan({
      exchange,
      tradingSymbol,
      decision
    });


  return {
    exchange:
      exchange.toUpperCase(),

    tradingSymbol:
      tradingSymbol.toUpperCase(),

    decision,

    reason,

    technicalScore:
      averageScore,

    actionable,

    readiness: {
      readyIntervals,

      minimumRequired:
        config.minimumReadyIntervals
    },

    thresholds: {
      buy:
        config.thresholds.buy,

      watch:
        config.thresholds.watch
    },

    technicalEvidence,

    confidence,

    risk,

    historicalConfirmation,

    marketMemory,

    tradePlan
  };
}