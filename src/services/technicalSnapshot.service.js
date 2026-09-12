import { getRedisClient } from "../config/redis.js";

export async function getTechnicalSnapshot({
  interval,
  exchange,
  tradingSymbol
}) {
  const redis = getRedisClient();

  const key = [
    "technical",
    interval,
    exchange.toUpperCase(),
    tradingSymbol.toUpperCase()
  ].join(":");

  const snapshot = await redis.hGetAll(key);

  if (
    !snapshot ||
    Object.keys(snapshot).length === 0
  ) {
    return null;
  }

  return {
    exchange: snapshot.exchange,
    tradingSymbol: snapshot.tradingSymbol,
    isin: snapshot.isin,

    close: toNumber(snapshot.close),

    emaFast: toNumber(snapshot.emaFast),
    emaSlow: toNumber(snapshot.emaSlow),

    rsi: toNumber(snapshot.rsi),

    macd: toNumber(snapshot.macd),
    macdSignal: toNumber(snapshot.macdSignal),
    macdHistogram: toNumber(snapshot.macdHistogram),

    atr: toNumber(snapshot.atr),

    bollingerMiddle:
      toNumber(snapshot.bollingerMiddle),

    bollingerUpper:
      toNumber(snapshot.bollingerUpper),

    bollingerLower:
      toNumber(snapshot.bollingerLower),

    momentumAbsolute:
      toNumber(snapshot.momentumAbsolute),

    momentumPercentage:
      toNumber(snapshot.momentumPercentage),

    lastCandleTimestamp:
      toNumber(snapshot.lastCandleTimestamp),
      
    ready:
      [
        snapshot.emaFast,
        snapshot.emaSlow,
        snapshot.rsi,
        snapshot.macd,
        snapshot.macdSignal,
        snapshot.macdHistogram,
        snapshot.atr,
        snapshot.bollingerMiddle,
        snapshot.bollingerUpper,
        snapshot.bollingerLower,
        snapshot.momentumAbsolute,
        snapshot.momentumPercentage
      ].every(
        (value) =>
          value !== undefined &&
          value !== null &&
          value !== ""
      )
  };
}

export async function getTechnicalSnapshots({
  intervals,
  exchange,
  tradingSymbol
}) {
  if (!Array.isArray(intervals) || intervals.length === 0) {
    throw new Error("intervals is required");
  }

  const results = await Promise.all(
    intervals.map(async (interval) => {
      const snapshot = await getTechnicalSnapshot({
        interval,
        exchange,
        tradingSymbol
      });

      return {
        interval,
        snapshot
      };
    })
  );

  return Object.fromEntries(
    results.map(({ interval, snapshot }) => [
      interval,
      snapshot
    ])
  );
}

function toNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const numericValue = Number(value);

  return Number.isFinite(numericValue)
    ? numericValue
    : null;
}