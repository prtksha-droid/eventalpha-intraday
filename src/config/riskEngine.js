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
      `Invalid numeric risk configuration: ${value}`
    );
  }

  return parsed;
}

export function getRiskEngineConfig() {
  return {
    atr: {
      low:
        parseNumber(
          process.env.RISK_ATR_LOW_THRESHOLD
        ),

      high:
        parseNumber(
          process.env.RISK_ATR_HIGH_THRESHOLD
        ),
    },
    
    momentum: {
      low:
        parseNumber(
          process.env.RISK_MOMENTUM_LOW_THRESHOLD
        ),

      high:
        parseNumber(
          process.env.RISK_MOMENTUM_HIGH_THRESHOLD
        ),
    },

    weights: {
      volatility:
        parseNumber(
          process.env.RISK_WEIGHT_VOLATILITY
        ),

      momentum:
        parseNumber(
          process.env.RISK_WEIGHT_MOMENTUM
        ),

      technicalDisagreement:
        parseNumber(
          process.env.RISK_WEIGHT_TECHNICAL_DISAGREEMENT
        ),
    },

    levels: {
      medium:
        parseNumber(
          process.env.RISK_MEDIUM_THRESHOLD
        ),

      high:
        parseNumber(
          process.env.RISK_HIGH_THRESHOLD
        ),
    },
  };
}