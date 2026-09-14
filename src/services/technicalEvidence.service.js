import {
  getSignalEngineConfig
} from "../config/signalEngine.js";

function getIntervalSeconds(interval) {
  if (
    typeof interval !== "string" ||
    !interval.trim()
  ) {
    return null;
  }

  const match = interval
    .trim()
    .toLowerCase()
    .match(/^(\d+)([mhd])$/);

  if (!match) {
    return null;
  }

  const value = Number(match[1]);
  const unit = match[2];

  if (
    !Number.isFinite(value) ||
    value <= 0
  ) {
    return null;
  }

  const unitSeconds = {
    m: 60,
    h: 60 * 60,
    d: 24 * 60 * 60
  };

  return value * unitSeconds[unit];
}

export function evaluateTechnicalEvidence(
  technicalContext
) {
  if (!technicalContext) {
    throw new Error(
      "technicalContext is required"
    );
  }
  const config =
    getSignalEngineConfig();
  const snapshots =
    technicalContext.snapshots ?? {};

  const evidence = {};

  for (
    const [interval, snapshot]
    of Object.entries(snapshots)
  ) {
    if (!snapshot) {
      evidence[interval] = {
        available: false,
        ready: false,
        indicators: null
      };

      continue;
    }

    const trend =
      snapshot.emaFast === null ||
      snapshot.emaSlow === null
        ? null
        : snapshot.emaFast > snapshot.emaSlow
          ? {
              direction: "BULLISH",
              score: config.weights.trend
            }
          : snapshot.emaFast < snapshot.emaSlow
            ? {
                direction: "BEARISH",
                score: -config.weights.trend
              }
            : {
                direction: "NEUTRAL",
                score: 0
              };

    const macd =
      snapshot.macd === null ||
      snapshot.macdSignal === null ||
      snapshot.macdHistogram === null
        ? null
        : snapshot.macd > snapshot.macdSignal &&
          snapshot.macdHistogram > 0
          ? {
              direction: "BULLISH",
              score: config.weights.macd
            }
          : snapshot.macd < snapshot.macdSignal &&
            snapshot.macdHistogram < 0
            ? {
                direction: "BEARISH",
                score: -config.weights.macd
              }
            : {
                direction: "NEUTRAL",
                score: 0
              };

    const momentum =
      snapshot.momentumPercentage === null
        ? null
        : snapshot.momentumPercentage > 0
          ? {
              direction: "BULLISH",
              score: config.weights.momentum
            }
          : snapshot.momentumPercentage < 0
            ? {
                direction: "BEARISH",
                score: -config.weights.momentum
              }
            : {
                direction: "NEUTRAL",
                score: 0
              };
              
    const rsi =
      snapshot.rsi === null
        ? null
        : snapshot.rsi <= config.rsi.oversold
          ? {
              state: "OVERSOLD",
              value: snapshot.rsi
            }
          : snapshot.rsi >= config.rsi.overbought
            ? {
                state: "OVERBOUGHT",
                value: snapshot.rsi
              }
            : {
                state: "NEUTRAL",
                value: snapshot.rsi
              };

    const bollinger =
      snapshot.close === null ||
      snapshot.bollingerMiddle === null ||
      snapshot.bollingerUpper === null ||
      snapshot.bollingerLower === null
        ? null
        : snapshot.close <= snapshot.bollingerLower
          ? {
              position: "BELOW_OR_AT_LOWER"
            }
          : snapshot.close >= snapshot.bollingerUpper
            ? {
                position: "ABOVE_OR_AT_UPPER"
              }
            : snapshot.close > snapshot.bollingerMiddle
              ? {
                  position: "ABOVE_MIDDLE"
                }
              : snapshot.close < snapshot.bollingerMiddle
                ? {
                    position: "BELOW_MIDDLE"
                  }
                : {
                    position: "AT_MIDDLE"
                  };
                  
    const bullishConfirmation =
      [
        trend?.direction,
        macd?.direction,
        momentum?.direction
      ].some(
        (direction) =>
          direction === "BULLISH"
      );

    const bearishConfirmation =
      [
        trend?.direction,
        macd?.direction,
        momentum?.direction
      ].some(
        (direction) =>
          direction === "BEARISH"
      );

    const rsiScore =
      !rsi
        ? null
        : rsi.state === "OVERSOLD" &&
          bullishConfirmation
          ? {
              direction: "BULLISH",
              score: config.weights.rsi,
              reason:
                "Oversold RSI with bullish confirmation"
            }
          : rsi.state === "OVERBOUGHT" &&
            bearishConfirmation
            ? {
                direction: "BEARISH",
                score: -config.weights.rsi,
                reason:
                  "Overbought RSI with bearish confirmation"
              }
            : {
                direction: "NEUTRAL",
                score: 0,
                reason:
                  "RSI state lacks directional confirmation"
              };

    const bollingerScore =
      !bollinger
        ? null
        : bollinger.position ===
            "BELOW_OR_AT_LOWER" &&
          bullishConfirmation
          ? {
              direction: "BULLISH",
              score: config.weights.bollinger,
              reason:
                "Lower Bollinger position with bullish confirmation"
            }
          : bollinger.position ===
              "ABOVE_OR_AT_UPPER" &&
            bearishConfirmation
            ? {
                direction: "BEARISH",
                score: -config.weights.bollinger,
                reason:
                  "Upper Bollinger position with bearish confirmation"
              }
            : {
                direction: "NEUTRAL",
                score: 0,
                reason:
                  "Bollinger position lacks reversal confirmation"
              };
              
    const scoreComponents = [
      trend?.score,
      macd?.score,
      momentum?.score,
      rsiScore?.score,
      bollingerScore?.score
    ].filter(
      (value) =>
        typeof value === "number" &&
        Number.isFinite(value)
    );

    const totalScore =
      scoreComponents.reduce(
        (sum, value) =>
          sum + value,
        0
      );
      
    const nowEpochSeconds =
      Math.floor(Date.now() / 1000);

    const lastCandleTimestamp =
      snapshot.lastCandleTimestamp;

    const freshnessGraceSeconds =
      config.freshness?.maxAgeSeconds;

    const intervalSeconds =
      getIntervalSeconds(interval);

    const technicalAgeSeconds =
      typeof lastCandleTimestamp === "number"
        ? nowEpochSeconds -
          lastCandleTimestamp
        : null;

    const allowedAgeSeconds =
      typeof intervalSeconds === "number" &&
      typeof freshnessGraceSeconds === "number" &&
      freshnessGraceSeconds > 0
        ? intervalSeconds +
          freshnessGraceSeconds
        : null;

    const isFresh =
      typeof technicalAgeSeconds === "number" &&
      typeof allowedAgeSeconds === "number" &&
      technicalAgeSeconds >= 0 &&
      technicalAgeSeconds <=
        allowedAgeSeconds;
        
    evidence[interval] = {
      available: true,
      freshness: {
          fresh: isFresh,
          ageSeconds:
            technicalAgeSeconds,
          allowedAgeSeconds,
          intervalSeconds,
          graceSeconds:
            freshnessGraceSeconds
        },
      ready:
          snapshot.ready === true &&
          isFresh,
      score: totalScore,
      evaluation: {
          trend,
          macd,
          momentum,

          rsi: {
            state: rsi,
            scoring: rsiScore
          },

          bollinger: {
            state: bollinger,
            scoring: bollingerScore
          }
        },
      indicators: {
        close: snapshot.close,

        emaFast: snapshot.emaFast,
        emaSlow: snapshot.emaSlow,

        rsi: snapshot.rsi,

        macd: snapshot.macd,
        macdSignal: snapshot.macdSignal,
        macdHistogram:
          snapshot.macdHistogram,

        atr: snapshot.atr,

        bollingerMiddle:
          snapshot.bollingerMiddle,
        bollingerUpper:
          snapshot.bollingerUpper,
        bollingerLower:
          snapshot.bollingerLower,

        momentumAbsolute:
          snapshot.momentumAbsolute,
        momentumPercentage:
          snapshot.momentumPercentage
      },

      lastCandleTimestamp:
        snapshot.lastCandleTimestamp
    };
  }
  const readyScores =
      Object.values(evidence)
        .filter(
          (item) =>
            item?.ready === true &&
            typeof item.score === "number"
        )
        .map(
          (item) =>
            item.score
        );

    const aggregate =
      readyScores.length
        ? {
            readyIntervals:
              readyScores.length,

            averageScore:
              readyScores.reduce(
                (sum, value) =>
                  sum + value,
                0
              ) / readyScores.length
          }
        : {
            readyIntervals: 0,
            averageScore: null
          };

    return {
      intervals: evidence,
      aggregate,
      
    };
  
}