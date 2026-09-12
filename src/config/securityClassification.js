export function getSecurityClassificationConfig() {
  return {
    companyEquityIsinPrefixes:
      process.env.COMPANY_EQUITY_ISIN_PREFIXES
        ?.split(",")
        .map((value) => value.trim())
        .filter(Boolean) ?? []
  };
}