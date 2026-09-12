function parseRequiredPositiveInteger(
  value,
  name
) {
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

export function getIntradaySignalScannerConfig() {
  return {
    batchSize:
      parseRequiredPositiveInteger(
        process.env
          .INTRADAY_SIGNAL_SCANNER_BATCH_SIZE,
        "INTRADAY_SIGNAL_SCANNER_BATCH_SIZE"
      ),

    concurrency:
      parseRequiredPositiveInteger(
        process.env
          .INTRADAY_SIGNAL_SCANNER_CONCURRENCY,
        "INTRADAY_SIGNAL_SCANNER_CONCURRENCY"
      ),

    pollSeconds:
      parseRequiredPositiveInteger(
        process.env
          .INTRADAY_SIGNAL_SCANNER_POLL_SECONDS,
        "INTRADAY_SIGNAL_SCANNER_POLL_SECONDS"
      )
  };
}