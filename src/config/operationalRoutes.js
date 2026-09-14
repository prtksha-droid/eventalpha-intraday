function requiredBoolean(name) {
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

  const normalized =
    rawValue
      .trim()
      .toLowerCase();

  if (normalized === "true") {
    return true;
  }

  if (normalized === "false") {
    return false;
  }

  throw new Error(
    `${name} must be true or false`
  );
}

export function getOperationalRoutesConfig() {
  return {
    enabled:
      requiredBoolean(
        "API_OPERATIONAL_ROUTES_ENABLED"
      )
  };
}