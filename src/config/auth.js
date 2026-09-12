function parsePositiveInteger(
  value,
  name
) {
  const parsed = Number.parseInt(
    value,
    10
  );

  if (
    !Number.isInteger(parsed) ||
    parsed <= 0
  ) {
    throw new Error(
      `${name} must be a positive integer`
    );
  }

  return parsed;
}

export function getAuthConfig() {
  const jwtSecret =
    process.env.JWT_SECRET;

  const jwtExpiresIn =
    process.env.JWT_EXPIRES_IN;

  if (!jwtSecret) {
    throw new Error(
      "JWT_SECRET is required"
    );
  }

  if (!jwtExpiresIn) {
    throw new Error(
      "JWT_EXPIRES_IN is required"
    );
  }

  return {
    jwt: {
      secret: jwtSecret,
      expiresIn: jwtExpiresIn
    },

    bcrypt: {
      rounds: parsePositiveInteger(
        process.env.BCRYPT_ROUNDS,
        "BCRYPT_ROUNDS"
      )
    }
  };
}