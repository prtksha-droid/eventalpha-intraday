function requiredPositiveInteger(name) {
  const rawValue =
    process.env[name];

  if (
    typeof rawValue !== "string" ||
    !rawValue.trim()
  ) {
    throw new Error(
      `${name} is required`
    );
  }

  const value =
    Number(rawValue);

  if (
    !Number.isInteger(value) ||
    value <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer`
    );
  }

  return value;
}

export function getLoginRateLimitConfig() {
  return {
    maxAttempts:
      requiredPositiveInteger(
        "AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS"
      ),

    windowSeconds:
      requiredPositiveInteger(
        "AUTH_LOGIN_RATE_LIMIT_WINDOW_SECONDS"
      )
  };
}