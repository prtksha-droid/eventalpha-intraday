function parseNumber(value) {
  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    return null;
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `Invalid numeric market memory configuration: ${value}`
    );
  }

  return parsed;
}

export function getMarketMemoryConfig() {
  return {
    interval:
      process.env.MARKET_MEMORY_INTERVAL,

    patternCandles:
      parseNumber(
        process.env.MARKET_MEMORY_PATTERN_CANDLES
      ),

    forwardCandles:
      parseNumber(
        process.env.MARKET_MEMORY_FORWARD_CANDLES
      ),

    historyLimit:
      parseNumber(
        process.env.MARKET_MEMORY_HISTORY_LIMIT
      ),

    maximumGapSeconds:
      parseNumber(
        process.env.MARKET_MEMORY_MAX_GAP_SECONDS
      ),

    minimumMatches:
      parseNumber(
        process.env.MARKET_MEMORY_MIN_MATCHES
      ),

    similarityThreshold:
      parseNumber(
        process.env.MARKET_MEMORY_SIMILARITY_THRESHOLD
      )
  };
}