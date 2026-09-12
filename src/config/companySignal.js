function parseList(value) {
  return value
    ?.split(",")
    .map((item) => item.trim().toUpperCase())
    .filter(Boolean) ?? [];
}

export function getCompanySignalConfig() {
  return {
    policy:
      process.env.COMPANY_SIGNAL_POLICY
        ?.trim()
        .toUpperCase() || null,

    exchangePriority: parseList(
      process.env.COMPANY_SIGNAL_EXCHANGE_PRIORITY
    ),
  };
}