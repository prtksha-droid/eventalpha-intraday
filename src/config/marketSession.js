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

function parseTimeToMinutes(
  value,
  name
) {
  const match =
    /^(\d{2}):(\d{2})$/.exec(value);

  if (!match) {
    throw new Error(
      `${name} must use HH:MM format`
    );
  }

  const hour = Number(match[1]);
  const minute = Number(match[2]);

  if (
    !Number.isInteger(hour) ||
    !Number.isInteger(minute) ||
    hour < 0 ||
    hour > 23 ||
    minute < 0 ||
    minute > 59
  ) {
    throw new Error(
      `${name} contains an invalid time`
    );
  }

  return (
    hour * 60 +
    minute
  );
}

export function getMarketSessionConfig() {
  const timezone =
    requiredString(
      "MARKET_TIMEZONE"
    );

  const openTime =
    requiredString(
      "MARKET_OPEN_TIME"
    );

  const closeTime =
    requiredString(
      "MARKET_CLOSE_TIME"
    );

  return {
    timezone,
    openTime,
    closeTime,
    openMinutes:
      parseTimeToMinutes(
        openTime,
        "MARKET_OPEN_TIME"
      ),
    closeMinutes:
      parseTimeToMinutes(
        closeTime,
        "MARKET_CLOSE_TIME"
      )
  };
}

export function isMarketSessionActive(
  now = new Date()
) {
  const config =
    getMarketSessionConfig();

  const formatter =
    new Intl.DateTimeFormat(
      "en-US",
      {
        timeZone:
          config.timezone,
        weekday: "short",
        hour: "2-digit",
        minute: "2-digit",
        hourCycle: "h23"
      }
    );

  const parts =
    Object.fromEntries(
      formatter
        .formatToParts(now)
        .filter(
          (part) =>
            part.type !== "literal"
        )
        .map(
          (part) => [
            part.type,
            part.value
          ]
        )
    );

  if (
    parts.weekday === "Sat" ||
    parts.weekday === "Sun"
  ) {
    return false;
  }

  const currentMinutes =
    Number(parts.hour) * 60 +
    Number(parts.minute);

  return (
    currentMinutes >=
      config.openMinutes &&
    currentMinutes <
      config.closeMinutes
  );
}