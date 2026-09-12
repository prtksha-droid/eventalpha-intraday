function parsePositiveNumber(
  value,
  name
) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      `${name} must be a positive number`
    );
  }

  return parsed;
}

export function getAlertConfig() {
  return {
    maxPriceAgeSeconds:
      parsePositiveNumber(
        process.env.ALERT_MAX_PRICE_AGE_SECONDS,
        "ALERT_MAX_PRICE_AGE_SECONDS"
      ),

    targetTolerancePercent:
      parsePositiveNumber(
        process.env.ALERT_TARGET_TOLERANCE_PERCENT,
        "ALERT_TARGET_TOLERANCE_PERCENT"
      ),

    cooldownSeconds:
      parsePositiveNumber(
        process.env.ALERT_COOLDOWN_SECONDS,
        "ALERT_COOLDOWN_SECONDS"
      )
  };
}