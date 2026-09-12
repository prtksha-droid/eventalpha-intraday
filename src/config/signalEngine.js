import {
  getTechnicalIntervals
} from "./technicalIntervals.js";

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
      `Invalid numeric signal configuration: ${value}`
    );
  }

  return parsed;
}

function parseList(value) {
  return value
    ?.split(",")
    .map((item) => item.trim())
    .filter(Boolean) ?? [];
}

export function getSignalEngineConfig() {
  const signalIntervals =
    parseList(
      process.env.SIGNAL_INTERVALS
    );

  return {
    intervals:
      signalIntervals.length
        ? signalIntervals
        : getTechnicalIntervals(),

    minimumReadyIntervals:
      parseNumber(
        process.env.SIGNAL_MIN_READY_INTERVALS
      ),

    thresholds: {
      buy:
        parseNumber(
          process.env.SIGNAL_BUY_THRESHOLD
        ),

      watch:
        parseNumber(
          process.env.SIGNAL_WATCH_THRESHOLD
        )
    },

    rsi: {
      oversold:
        parseNumber(
          process.env.SIGNAL_RSI_OVERSOLD
        ),

      overbought:
        parseNumber(
          process.env.SIGNAL_RSI_OVERBOUGHT
        )
    },

        weights: {
      trend:
        parseNumber(
          process.env.SIGNAL_WEIGHT_TREND
        ),

      macd:
        parseNumber(
          process.env.SIGNAL_WEIGHT_MACD
        ),

      momentum:
        parseNumber(
          process.env.SIGNAL_WEIGHT_MOMENTUM
        ),

      rsi:
        parseNumber(
          process.env.SIGNAL_WEIGHT_RSI
        ),

      bollinger:
        parseNumber(
          process.env.SIGNAL_WEIGHT_BOLLINGER
        )
    },

    freshness: {
      maxAgeSeconds:
        parseNumber(
          process.env.SIGNAL_MAX_TECHNICAL_AGE_SECONDS
        ),
    },
    
    confidence: {
      technicalReadinessWeight:
        parseNumber(
          process.env.SIGNAL_CONFIDENCE_TECHNICAL_READINESS_WEIGHT
        ),

      technicalAgreementWeight:
        parseNumber(
          process.env.SIGNAL_CONFIDENCE_TECHNICAL_AGREEMENT_WEIGHT
        ),

      marketMemoryReadinessWeight:
        parseNumber(
          process.env.SIGNAL_CONFIDENCE_MEMORY_READINESS_WEIGHT
        ),

      marketMemoryAlignmentWeight:
        parseNumber(
          process.env.SIGNAL_CONFIDENCE_MEMORY_ALIGNMENT_WEIGHT
        )
    }
  };
}