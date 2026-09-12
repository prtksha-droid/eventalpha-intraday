export function evaluateSignalConfidence({
  technicalEvidence,
  marketMemory,
  configuredIntervals,
  technicalDecision,
  confidenceConfig
}) {
  if (!technicalEvidence) {
    throw new Error(
      "technicalEvidence is required"
    );
  }

  const intervalEvidence =
    technicalEvidence.intervals ?? {};

  const readyItems =
    Object.values(intervalEvidence)
      .filter(
        (item) =>
          item?.ready === true
      );

  const readyIntervals =
    readyItems.length;

  const totalConfiguredIntervals =
    Array.isArray(configuredIntervals)
      ? configuredIntervals.length
      : 0;

  const technicalReadiness =
    totalConfiguredIntervals > 0
      ? readyIntervals /
        totalConfiguredIntervals
      : null;

  const positiveIntervals =
    readyItems.filter(
      (item) =>
        typeof item.score === "number" &&
        item.score > 0
    ).length;

  const negativeIntervals =
    readyItems.filter(
      (item) =>
        typeof item.score === "number" &&
        item.score < 0
    ).length;

  const neutralIntervals =
    readyItems.filter(
      (item) =>
        typeof item.score === "number" &&
        item.score === 0
    ).length;

  const largestDirectionalGroup =
    Math.max(
      positiveIntervals,
      negativeIntervals,
      neutralIntervals
    );

  const technicalAgreement =
    readyIntervals > 0
      ? largestDirectionalGroup /
        readyIntervals
      : null;

  const marketMemoryReadiness =
    marketMemory?.ready === true
      ? 1
      : 0;

  const marketMemoryAgreement =
    marketMemory?.ready === true
      ? (
          marketMemory?.agreement
            ?.allAgree === true
            ? 1
            : 0
        )
      : null;
      
  const marketMemoryAlignment =
      marketMemory?.ready !== true
        ? null

        : technicalDecision === "BUY"
          ? (
              marketMemory.direction === "BULLISH"
                ? "ALIGNED"
                : marketMemory.direction === "BEARISH"
                  ? "CONFLICT"
                  : "MIXED"
            )

        : technicalDecision === "WATCH"
          ? (
              marketMemory.direction === "BULLISH"
                ? "ALIGNED"
                : marketMemory.direction === "BEARISH"
                  ? "CONFLICT"
                  : "MIXED"
            )

        : "NOT_APPLICABLE";
        
  const alignmentValue =
      marketMemoryAlignment === "ALIGNED"
        ? 1
        : marketMemoryAlignment === "MIXED"
          ? 0.5
          : 0;

    const confidenceScore =
      (
        (technicalReadiness ?? 0) *
        (confidenceConfig?.technicalReadinessWeight ?? 0)
      ) +
      (
        (technicalAgreement ?? 0) *
        (confidenceConfig?.technicalAgreementWeight ?? 0)
      ) +
      (
        marketMemoryReadiness *
        (confidenceConfig?.marketMemoryReadinessWeight ?? 0)
      ) +
      (
        alignmentValue *
        (confidenceConfig?.marketMemoryAlignmentWeight ?? 0)
      );
      
    const confidenceComponents = {
      technicalReadiness:
        (technicalReadiness ?? 0) *
        (confidenceConfig?.technicalReadinessWeight ?? 0),

      technicalAgreement:
        (technicalAgreement ?? 0) *
        (confidenceConfig?.technicalAgreementWeight ?? 0),

      marketMemoryReadiness:
        marketMemoryReadiness *
        (confidenceConfig?.marketMemoryReadinessWeight ?? 0),

      marketMemoryAlignment:
        alignmentValue *
        (confidenceConfig?.marketMemoryAlignmentWeight ?? 0)
    };

  return {
      score:
        confidenceScore,

      components:
        confidenceComponents,

      technical: {
          readiness:
            technicalReadiness,

          agreement:
            technicalAgreement,

          readyIntervals,

          totalConfiguredIntervals,

          positiveIntervals,
          negativeIntervals,
          neutralIntervals
        },

    marketMemory: {
      readiness:
        marketMemoryReadiness,

      agreement:
        marketMemoryAgreement,

      alignment:
        marketMemoryAlignment
    }
  };
}