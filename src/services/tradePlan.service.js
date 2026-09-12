import {
  getTradePlanConfig
} from "../config/tradePlan.js";

import {
  getLivePrice
} from "./livePrice.service.js";

import {
  getTechnicalSnapshot
} from "./technicalSnapshot.service.js";


export async function buildTradePlan({
  exchange,
  tradingSymbol,
  decision
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

  const normalizedExchange =
    exchange.toUpperCase();

  const normalizedTradingSymbol =
    tradingSymbol.toUpperCase();

  /*
   * Initial trade-plan implementation
   * generates execution plans only for BUY
   * signals.
   *
   * AVOID does not automatically mean SHORT.
   */
  if (
    String(decision || "")
      .toUpperCase() !== "BUY"
  ) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      reason:
        "TRADE_PLAN_NOT_APPLICABLE",

      decision:
        decision || null
    };
  }

  const config =
    getTradePlanConfig();

  /*
   * Load:
   *
   * 1. Actual current Groww / Redis price
   * 2. Execution timeframe snapshot
   * 3. Confirmation timeframe snapshot
   *
   * With current configuration this means:
   *
   * execution    -> 5m
   * confirmation -> 15m
   *
   * but nothing is hardcoded here.
   */
  const [
    livePrice,
    executionSnapshot,
    confirmationSnapshot
  ] = await Promise.all([
    getLivePrice({
      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol
    }),

    getTechnicalSnapshot({
      interval:
        config.interval,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol
    }),

    getTechnicalSnapshot({
      interval:
        config.confirmationInterval,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol
    })
  ]);


  /*
   * Live price is mandatory.
   */
  if (
    !livePrice ||
    livePrice.available !== true
  ) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      reason:
        livePrice?.reason ||
        "LIVE_PRICE_NOT_AVAILABLE"
    };
  }
  const priceAgeSeconds =
      livePrice.ageSeconds;

    const priceFresh =
      typeof priceAgeSeconds === "number" &&
      priceAgeSeconds <=
        config.freshness
          .maxPriceAgeSeconds;

  /*
   * Execution snapshot must be fully ready.
   */
  if (
    !executionSnapshot ||
    executionSnapshot.ready !== true
  ) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      currentPrice:
        livePrice.price,

      reason:
        "EXECUTION_INTERVAL_NOT_READY",

      interval:
        config.interval
    };
  }


  /*
   * Confirmation snapshot must also be ready.
   */
  if (
    !confirmationSnapshot ||
    confirmationSnapshot.ready !== true
  ) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      currentPrice:
        livePrice.price,

      reason:
        "CONFIRMATION_INTERVAL_NOT_READY",

      confirmationInterval:
        config.confirmationInterval
    };
  }


  const currentPrice =
    livePrice.price;

  const technicalReferencePrice =
    executionSnapshot.close;

  const atr =
    executionSnapshot.atr;


  if (
    !isPositiveNumber(
      technicalReferencePrice
    )
  ) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      currentPrice,

      reason:
        "INVALID_EXECUTION_REFERENCE_PRICE"
    };
  }


  if (!isPositiveNumber(atr)) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      currentPrice,

      reason:
        "ATR_NOT_AVAILABLE"
    };
  }


  /*
   * 15m trend confirmation.
   *
   * Initial confirmation rule:
   *
   * EMA fast > EMA slow
   *
   * We already calculate these indicators
   * inside the technical worker, so no duplicate
   * indicator calculation is introduced here.
   */
  const confirmation =
    evaluateBullishConfirmation(
      confirmationSnapshot
    );


  /*
   * ENTRY ZONE
   *
   * The last completed execution candle close
   * is the technical reference.
   *
   * The live Redis LTP decides whether the
   * opportunity is currently enterable.
   */
  const entryBuffer =
    atr *
    config.entry
      .atrBufferMultiplier;

  const entryLower =
    technicalReferencePrice -
    entryBuffer;

  const entryUpper =
    technicalReferencePrice +
    entryBuffer;


  /*
   * Maximum distance above the technical
   * reference where we still consider waiting
   * for a retest.
   *
   * Beyond this point we consider the move
   * chased / missed for this plan.
   */
  const maximumChasePrice =
    technicalReferencePrice +
    (
      atr *
      config.entry
        .maxChaseAtrMultiplier
    );


  const priceEntryStatus =
    determinePriceEntryStatus({
      currentPrice,
      entryLower,
      entryUpper,
      maximumChasePrice
    });


  /*
   * Time-based entry eligibility.
   */
  const timing =
    evaluateTradingTime({
      timezone:
        config.timing.timezone,

      lastEntryTime:
        config.timing
          .lastEntryTime,

      hardExitTime:
        config.timing
          .hardExitTime
    });


  /*
   * Conservative reference entry.
   *
   * We calculate risk from the upper edge of
   * the entry range so the displayed R:R does
   * not assume a better fill than the user may
   * actually receive.
   */
  const referenceEntryPrice =
    entryUpper;


  /*
   * STOP LOSS
   *
   * Initial implementation uses configured
   * ATR distance.
   *
   * Later we can enhance this with swing-low
   * and support structure.
   */
  const stopDistance =
    atr *
    config.stopLoss
      .atrMultiplier;

  const stopLossPrice =
    referenceEntryPrice -
    stopDistance;


  if (
    !isPositiveNumber(
      stopLossPrice
    )
  ) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      currentPrice,

      reason:
        "INVALID_STOP_LOSS"
    };
  }


  const riskPerShare =
    referenceEntryPrice -
    stopLossPrice;


  if (
    !isPositiveNumber(
      riskPerShare
    )
  ) {
    return {
      available: false,

      exchange:
        normalizedExchange,

      tradingSymbol:
        normalizedTradingSymbol,

      currentPrice,

      reason:
        "INVALID_RISK_DISTANCE"
    };
  }


  /*
   * TARGETS
   *
   * Targets are derived from actual risk,
   * rather than fixed percentage moves.
   */
  const target1Price =
    referenceEntryPrice +
    (
      riskPerShare *
      config.targets
        .target1RewardRisk
    );

  const target2Price =
    referenceEntryPrice +
    (
      riskPerShare *
      config.targets
        .target2RewardRisk
    );


  /*
   * Final entry state combines:
   *
   * - current price position
   * - 15m confirmation
   * - allowed entry time
   */
  const entryStatus =
      determineFinalEntryStatus({
        confirmation,
        priceEntryStatus,
        timing,
        priceFresh
      });


  return {
    available: true,

    exchange:
      normalizedExchange,

    tradingSymbol:
      normalizedTradingSymbol,

    isin:
      livePrice.isin ||
      executionSnapshot.isin ||
      null,

    direction:
      "LONG",

    generatedAt:
      new Date(),

    currentPrice: {
      price:
        currentPrice,

      timestamp:
        livePrice.timestamp,

      ageSeconds:
        livePrice.ageSeconds,

      source:
        livePrice.source,

      fresh:
        priceFresh,

      freshness:
        priceFresh
          ? "FRESH"
          : "STALE",

      maxAgeSeconds:
        config.freshness
          .maxPriceAgeSeconds
    },


    execution: {
      interval:
        config.interval,

      technicalReferencePrice,

      atr,

      lastCandleTimestamp:
        executionSnapshot
          .lastCandleTimestamp
    },


    confirmation: {
      interval:
        config.confirmationInterval,

      ready:
        confirmationSnapshot.ready,

      bullish:
        confirmation.bullish,

      reason:
        confirmation.reason,

      emaFast:
        confirmationSnapshot.emaFast,

      emaSlow:
        confirmationSnapshot.emaSlow,

      lastCandleTimestamp:
        confirmationSnapshot
          .lastCandleTimestamp
    },


    entry: {
      status:
        entryStatus,

      priceStatus:
        priceEntryStatus,

      referencePrice:
        referenceEntryPrice,

      lower:
        entryLower,

      upper:
        entryUpper,

      maximumChasePrice,

      buffer:
        entryBuffer,

      atrBufferMultiplier:
        config.entry
          .atrBufferMultiplier,

      maxChaseAtrMultiplier:
        config.entry
          .maxChaseAtrMultiplier
    },


    stopLoss: {
      price:
        stopLossPrice,

      distance:
        stopDistance,

      riskPerShare,

      atrMultiplier:
        config.stopLoss
          .atrMultiplier,

      basis:
        "ATR"
    },


    targets: [
      {
        level: 1,

        price:
          target1Price,

        rewardRisk:
          config.targets
            .target1RewardRisk
      },

      {
        level: 2,

        price:
          target2Price,

        rewardRisk:
          config.targets
            .target2RewardRisk
      }
    ],


    riskReward: {
      referenceEntryPrice,

      stopLossPrice,

      riskPerShare,

      target1:
        config.targets
          .target1RewardRisk,

      target2:
        config.targets
          .target2RewardRisk
    },


    timing: {
      timezone:
        config.timing.timezone,

      currentMarketTime:
        timing.currentMarketTime,

      entryAllowed:
        timing.entryAllowed,

      hardExitReached:
        timing.hardExitReached,

      lastEntryTime:
        config.timing
          .lastEntryTime,

      hardExitTime:
        config.timing
          .hardExitTime
    },


    exit: {
      hardExitTime:
        config.timing
          .hardExitTime,

      triggers: [
        "STOP_LOSS",
        "TARGET_1",
        "TARGET_2",
        "SIGNAL_REVERSAL",
        "TIME_EXIT"
      ]
    }
  };
}


function evaluateBullishConfirmation(
  snapshot
) {
  const emaFast =
    snapshot?.emaFast;

  const emaSlow =
    snapshot?.emaSlow;

  if (
    !isPositiveNumber(emaFast) ||
    !isPositiveNumber(emaSlow)
  ) {
    return {
      bullish: false,
      reason:
        "CONFIRMATION_EMA_NOT_AVAILABLE"
    };
  }

  if (emaFast > emaSlow) {
    return {
      bullish: true,
      reason:
        "FAST_EMA_ABOVE_SLOW_EMA"
    };
  }

  return {
    bullish: false,
    reason:
      "FAST_EMA_NOT_ABOVE_SLOW_EMA"
  };
}


function determinePriceEntryStatus({
  currentPrice,
  entryLower,
  entryUpper,
  maximumChasePrice
}) {
  if (currentPrice < entryLower) {
    return "WAIT_FOR_ENTRY";
  }

  if (
    currentPrice >= entryLower &&
    currentPrice <= entryUpper
  ) {
    return "IN_ENTRY_ZONE";
  }

  if (
    currentPrice > entryUpper &&
    currentPrice <= maximumChasePrice
  ) {
    return "WAIT_FOR_RETEST";
  }

  return "ENTRY_MISSED";
}


function determineFinalEntryStatus({
  confirmation,
  priceEntryStatus,
  timing,
  priceFresh
}) {
  if (timing.hardExitReached) {
    return "DO_NOT_ENTER";
  }

  if (!timing.entryAllowed) {
    return "NO_NEW_ENTRY";
  }

  if (!priceFresh) {
    return "DO_NOT_ENTER_STALE_PRICE";
  }

  if (!confirmation.bullish) {
    return "WAIT_FOR_CONFIRMATION";
  }

  if (
    priceEntryStatus ===
    "IN_ENTRY_ZONE"
  ) {
    return "ENTER";
  }

  return priceEntryStatus;
}


function evaluateTradingTime({
  timezone,
  lastEntryTime,
  hardExitTime
}) {
  const now =
    new Date();

  const formatter =
    new Intl.DateTimeFormat(
      "en-GB",
      {
        timeZone: timezone,

        hour:
          "2-digit",

        minute:
          "2-digit",

        hour12:
          false
      }
    );

  const currentMarketTime =
    formatter.format(now);

  const currentMinutes =
    parseClockMinutes(
      currentMarketTime
    );

  const lastEntryMinutes =
    parseClockMinutes(
      lastEntryTime
    );

  const hardExitMinutes =
    parseClockMinutes(
      hardExitTime
    );

  return {
    currentMarketTime,

    entryAllowed:
      currentMinutes <
      lastEntryMinutes,

    hardExitReached:
      currentMinutes >=
      hardExitMinutes
  };
}


function parseClockMinutes(value) {
  const [
    hours,
    minutes
  ] =
    String(value)
      .split(":")
      .map(Number);

  if (
    !Number.isInteger(hours) ||
    !Number.isInteger(minutes)
  ) {
    throw new Error(
      `Invalid clock value: ${value}`
    );
  }

  return (
    hours * 60 +
    minutes
  );
}


function isPositiveNumber(value) {
  return (
    typeof value === "number" &&
    Number.isFinite(value) &&
    value > 0
  );
}