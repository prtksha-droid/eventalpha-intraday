function requiredNumber(name) {
  const value = process.env[name];

  if (
    value === undefined ||
    value === null ||
    value === ""
  ) {
    throw new Error(
      `${name} is required`
    );
  }

  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    throw new Error(
      `${name} must be numeric`
    );
  }

  return parsed;
}

function requiredString(name) {
  const value =
    process.env[name]?.trim();

  if (!value) {
    throw new Error(
      `${name} is required`
    );
  }

  return value;
}

export function getTradePlanConfig() {
  return {
    interval:
      requiredString(
        "TRADE_PLAN_INTERVAL"
      ),

    confirmationInterval:
      requiredString(
        "TRADE_PLAN_CONFIRMATION_INTERVAL"
      ),

    entry: {
      atrBufferMultiplier:
        requiredNumber(
          "TRADE_PLAN_ENTRY_ATR_MULTIPLIER"
        ),

      maxChaseAtrMultiplier:
        requiredNumber(
          "TRADE_PLAN_MAX_CHASE_ATR_MULTIPLIER"
        )
    },

    stopLoss: {
      atrMultiplier:
        requiredNumber(
          "TRADE_PLAN_STOP_ATR_MULTIPLIER"
        )
    },

    targets: {
      target1RewardRisk:
        requiredNumber(
          "TRADE_PLAN_TARGET1_RR"
        ),

      target2RewardRisk:
        requiredNumber(
          "TRADE_PLAN_TARGET2_RR"
        )
    },
    
    freshness: {
      maxPriceAgeSeconds:
        requiredNumber(
          "TRADE_PLAN_MAX_PRICE_AGE_SECONDS"
        )
    },

    timing: {
      timezone:
        requiredString(
          "MARKET_TIMEZONE"
        ),

      lastEntryTime:
        requiredString(
          "TRADE_PLAN_LAST_ENTRY_TIME"
        ),

      hardExitTime:
        requiredString(
          "TRADE_PLAN_HARD_EXIT_TIME"
        )
    }
  };
}