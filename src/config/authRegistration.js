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

  const normalizedValue =
    rawValue
      .trim()
      .toLowerCase();

  if (normalizedValue === "true") {
    return true;
  }

  if (normalizedValue === "false") {
    return false;
  }

  throw new Error(
    `${name} must be true or false`
  );
}

export function getAuthRegistrationConfig() {
  return {
    publicRegistrationEnabled:
      requiredBoolean(
        "AUTH_PUBLIC_REGISTRATION_ENABLED"
      )
  };
}