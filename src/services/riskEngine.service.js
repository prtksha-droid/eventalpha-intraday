import {
  getRiskEngineConfig,
} from "../config/riskEngine.js";

export function evaluateRisk({
  technicalEvidence,
}) {
  if (!technicalEvidence) {
    throw new Error(
      "technicalEvidence is required"
    );
  }

  const config =
    getRiskEngineConfig();

  const intervals =
    Object.entries(
      technicalEvidence.intervals ?? {}
    ).filter(
      ([, item]) =>
        item?.ready === true
    );

  if (!intervals.length) {
      return {
        score: null,
        level: "UNAVAILABLE",
        components: {},
        evidence: {
          readyIntervals: 0,
        },
      };
    }

  const volatilityValues = [];
  const momentumValues = [];
  const directionalVotes = [];

  for (const [, interval] of intervals) {
    const close =
      interval.indicators?.close;

    const atr =
      interval.indicators?.atr;

    const momentum =
      interval.indicators
        ?.momentumPercentage;

    if (
      typeof close === "number" &&
      close > 0 &&
      typeof atr === "number"
    ) {
      volatilityValues.push(
        (atr / close) * 100
      );
    }

    if (
      typeof momentum === "number"
    ) {
      momentumValues.push(
        Math.abs(momentum)
      );
    }

    const directions = [
      interval.evaluation
        ?.trend?.direction,

      interval.evaluation
        ?.macd?.direction,

      interval.evaluation
        ?.momentum?.direction,
    ].filter(Boolean);

    directionalVotes.push(
      ...directions
    );
  }

  const averageVolatilityPct =
    average(volatilityValues);

  const averageMomentumPct =
    average(momentumValues);

  const technicalDisagreement =
    calculateDisagreement(
      directionalVotes
    );
    
  const volatilityRisk =
      classifyBand(
        averageVolatilityPct,
        config.atr.low,
        config.atr.high
      );

  const momentumRisk =
      classifyBand(
        averageMomentumPct,
        config.momentum.low,
        config.momentum.high
      );
      
  const weightedRiskScore =
      calculateWeightedScore(
        {
          volatility: volatilityRisk,
          momentum: momentumRisk,
          technicalDisagreement,
        },
        config.weights
      );  

  const riskLevel =
      classifyRiskLevel(
        weightedRiskScore,
        config.levels.medium,
        config.levels.high
      );      

  return {
      score: weightedRiskScore,
      level: riskLevel,

    components: {
      volatility: volatilityRisk,
      momentum: momentumRisk,
      technicalDisagreement,
    },

    evidence: {
      readyIntervals:
        intervals.length,

      averageAtrPct:
        averageVolatilityPct,

      averageAbsoluteMomentumPct:
        averageMomentumPct,

      technicalDisagreement,
    },

    config,
  };
}

function average(values) {
  if (!values.length) {
    return null;
  }

  return (
    values.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / values.length
  );
}

function calculateDisagreement(
  directions
) {
  if (!directions.length) {
    return null;
  }

  const counts = {};

  for (const direction of directions) {
    counts[direction] =
      (counts[direction] ?? 0) + 1;
  }

  const largestGroup =
    Math.max(
      ...Object.values(counts)
    );

  return (
    1 -
    largestGroup /
      directions.length
  );
}

function classifyBand(
  value,
  lowThreshold,
  highThreshold
) {
  if (
    value === null ||
    lowThreshold === null ||
    highThreshold === null
  ) {
    return null;
  }

  if (value >= highThreshold) {
    return 1;
  }

  if (value >= lowThreshold) {
    return 0.5;
  }

  return 0;
}

function calculateWeightedScore(
  components,
  weights
) {
  const entries = [
    [
      components.volatility,
      weights.volatility,
    ],
    [
      components.momentum,
      weights.momentum,
    ],
    [
      components.technicalDisagreement,
      weights.technicalDisagreement,
    ],
  ].filter(
    ([component, weight]) =>
      component !== null &&
      weight !== null
  );

  if (!entries.length) {
    return null;
  }

  const totalWeight =
    entries.reduce(
      (sum, [, weight]) =>
        sum + weight,
      0
    );

  if (totalWeight <= 0) {
    return null;
  }

  return (
    entries.reduce(
      (
        sum,
        [component, weight]
      ) =>
        sum +
        component * weight,
      0
    ) / totalWeight
  );
}
function classifyRiskLevel(
  score,
  mediumThreshold,
  highThreshold
) {
  if (
    score === null ||
    mediumThreshold === null ||
    highThreshold === null
  ) {
    return "UNAVAILABLE";
  }

  if (score >= highThreshold) {
    return "HIGH";
  }

  if (score >= mediumThreshold) {
    return "MEDIUM";
  }

  return "LOW";
}