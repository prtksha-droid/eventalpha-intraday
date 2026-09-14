function requiredString(name) {
  const value = process.env[name];

  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    throw new Error(
      `${name} is required`
    );
  }

  return value.trim();
}

export function getCorsOptions() {
  const allowedOrigins =
    requiredString(
      "CORS_ALLOWED_ORIGINS"
    )
      .split(",")
      .map((origin) => origin.trim())
      .filter(Boolean);

  if (!allowedOrigins.length) {
    throw new Error(
      "CORS_ALLOWED_ORIGINS must contain at least one origin"
    );
  }

  return {
    origin(origin, callback) {
      /*
       * Requests without an Origin header are allowed.
       * This keeps Render health checks, Postman,
       * curl and server-to-server calls working.
       */
      if (!origin) {
        callback(null, true);
        return;
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        callback(null, true);
        return;
      }

      callback(null, false);
    }
  };
}