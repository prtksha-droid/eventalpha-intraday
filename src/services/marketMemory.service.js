import { Candle } from "../models/Candle.js";

import {
  getMarketMemoryConfig
} from "../config/marketMemory.js";

function isContinuous(
  candles,
  maximumGapSeconds
) {
  for (
    let index = 1;
    index < candles.length;
    index += 1
  ) {
    const gap =
      candles[index].startTimestamp -
      candles[index - 1].startTimestamp;

    if (gap !== maximumGapSeconds) {
      return false;
    }
  }

  return true;
}

function normalizePattern(candles) {
  if (!candles.length) {
    return [];
  }

  const base =
    Number(candles[0].close);

  if (
    !Number.isFinite(base) ||
    base === 0
  ) {
    return [];
  }

  return candles.map((candle) => ({
    open:
      (
        Number(candle.open) -
        base
      ) / base,

    high:
      (
        Number(candle.high) -
        base
      ) / base,

    low:
      (
        Number(candle.low) -
        base
      ) / base,

    close:
      (
        Number(candle.close) -
        base
      ) / base
  }));
}

function calculateSimilarity(
  currentPattern,
  historicalPattern
) {
  if (
    !currentPattern.length ||
    currentPattern.length !==
      historicalPattern.length
  ) {
    return null;
  }

  const currentVector = [];
  const historicalVector = [];

  for (
    let index = 0;
    index < currentPattern.length;
    index += 1
  ) {
    for (
      const field of [
        "open",
        "high",
        "low",
        "close"
      ]
    ) {
      currentVector.push(
        currentPattern[index][field]
      );

      historicalVector.push(
        historicalPattern[index][field]
      );
    }
  }

  let dotProduct = 0;
  let currentMagnitude = 0;
  let historicalMagnitude = 0;

  for (
    let index = 0;
    index < currentVector.length;
    index += 1
  ) {
    const current =
      currentVector[index];

    const historical =
      historicalVector[index];

    dotProduct +=
      current * historical;

    currentMagnitude +=
      current * current;

    historicalMagnitude +=
      historical * historical;
  }

  if (
    currentMagnitude === 0 ||
    historicalMagnitude === 0
  ) {
    return null;
  }

  return (
    dotProduct /
    (
      Math.sqrt(currentMagnitude) *
      Math.sqrt(historicalMagnitude)
    )
  );
}

function calculateForwardReturn(
  patternCandles,
  forwardCandles
) {
  if (
    !patternCandles.length ||
    !forwardCandles.length
  ) {
    return null;
  }

  const entry =
    Number(
      patternCandles[
        patternCandles.length - 1
      ].close
    );

  const exit =
    Number(
      forwardCandles[
        forwardCandles.length - 1
      ].close
    );

  if (
    !Number.isFinite(entry) ||
    !Number.isFinite(exit) ||
    entry === 0
  ) {
    return null;
  }

  return (
    (exit - entry) /
    entry
  ) * 100;
}

export async function getMarketMemory({
  exchange,
  tradingSymbol
}) {
  const config =
    getMarketMemoryConfig();

  const requiredHistory =
    config.patternCandles +
    config.forwardCandles;

  const candles =
    await Candle.find({
      exchange:
        exchange.toUpperCase(),

      tradingSymbol:
        tradingSymbol.toUpperCase(),

      interval:
        config.interval,

      source:
        "GROWW_HISTORICAL"
    })
      .select({
        _id: 0,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        startTimestamp: 1
      })
      .sort({
        startTimestamp: -1
      })
      .limit(
        config.historyLimit
      )
      .lean();

  candles.reverse();

  if (
    candles.length <
    requiredHistory
  ) {
    return {
      ready: false,
      reason:
        "Insufficient historical candles",
      matches: []
    };
  }

  const currentCandles =
    await Candle.find({
      exchange:
        exchange.toUpperCase(),

      tradingSymbol:
        tradingSymbol.toUpperCase(),

      interval:
        config.interval
    })
      .select({
        _id: 0,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        startTimestamp: 1
      })
      .sort({
        startTimestamp: -1
      })
      .limit(
        config.patternCandles
      )
      .lean();

  currentCandles.reverse();

  if (
    currentCandles.length <
    config.patternCandles ||
    !isContinuous(
      currentCandles,
      config.maximumGapSeconds
    )
  ) {
    return {
      ready: false,
      reason:
        "Current pattern is incomplete",
      matches: []
    };
  }

  const normalizedCurrent =
    normalizePattern(
      currentCandles
    );

  const matches = [];

  for (
    let start = 0;
    start <=
      candles.length -
        requiredHistory;
    start += 1
  ) {
    const pattern =
      candles.slice(
        start,
        start +
          config.patternCandles
      );

    const forward =
      candles.slice(
        start +
          config.patternCandles,
        start +
          requiredHistory
      );

    const sequence = [
      ...pattern,
      ...forward
    ];

    if (
      !isContinuous(
        sequence,
        config.maximumGapSeconds
      )
    ) {
      continue;
    }

    const similarity =
      calculateSimilarity(
        normalizedCurrent,
        normalizePattern(pattern)
      );

    if (
      similarity === null ||
      similarity <
        config.similarityThreshold
    ) {
      continue;
    }

    const forwardReturnPct =
      calculateForwardReturn(
        pattern,
        forward
      );

    if (
      forwardReturnPct === null
    ) {
      continue;
    }

    matches.push({
      similarity,
      forwardReturnPct,

      patternStartTimestamp:
        pattern[0].startTimestamp,

      patternEndTimestamp:
        pattern[
          pattern.length - 1
        ].startTimestamp
    });
  }

  return {
    ready:
      matches.length >=
      config.minimumMatches,

    matchCount:
      matches.length,

    minimumMatches:
      config.minimumMatches,

    matches
  };
}