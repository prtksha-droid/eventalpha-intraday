export function evaluateMarketMemoryEvidence(
  marketMemory
) {
  if (!marketMemory) {
    throw new Error(
      "marketMemory is required"
    );
  }

  const matches =
    Array.isArray(marketMemory.matches)
      ? marketMemory.matches
      : [];

  if (!matches.length) {
    return {
      ready: false,
      matchCount: 0,
      averageForwardReturnPct: null,
      medianForwardReturnPct: null,
      positiveOutcomeRate: null,
      negativeOutcomeRate: null,
      similarityWeightedReturnPct: null,
      bestSimilarity: null
    };
  }

  const returns =
    matches
      .map(
        (match) =>
          Number(match.forwardReturnPct)
      )
      .filter(
        (value) =>
          Number.isFinite(value)
      );

  if (!returns.length) {
    return {
      ready: false,
      matchCount: matches.length,
      averageForwardReturnPct: null,
      medianForwardReturnPct: null,
      positiveOutcomeRate: null,
      negativeOutcomeRate: null,
      similarityWeightedReturnPct: null,
      bestSimilarity: null
    };
  }

  const averageForwardReturnPct =
    returns.reduce(
      (sum, value) =>
        sum + value,
      0
    ) / returns.length;

  const sortedReturns =
    [...returns].sort(
      (a, b) =>
        a - b
    );

  const middle =
    Math.floor(
      sortedReturns.length / 2
    );

  const medianForwardReturnPct =
    sortedReturns.length % 2 === 0
      ? (
          sortedReturns[
            middle - 1
          ] +
          sortedReturns[
            middle
          ]
        ) / 2
      : sortedReturns[
          middle
        ];

  const positiveCount =
    returns.filter(
      (value) =>
        value > 0
    ).length;

  const negativeCount =
    returns.filter(
      (value) =>
        value < 0
    ).length;

  let weightedReturnTotal = 0;
  let similarityTotal = 0;
  let bestSimilarity = null;

  for (const match of matches) {
    const similarity =
      Number(match.similarity);

    const forwardReturnPct =
      Number(
        match.forwardReturnPct
      );

    if (
      !Number.isFinite(similarity) ||
      !Number.isFinite(
        forwardReturnPct
      )
    ) {
      continue;
    }

    weightedReturnTotal +=
      similarity *
      forwardReturnPct;

    similarityTotal +=
      similarity;

    if (
      bestSimilarity === null ||
      similarity > bestSimilarity
    ) {
      bestSimilarity =
        similarity;
    }
  }

  const similarityWeightedReturnPct =
    similarityTotal > 0
      ? weightedReturnTotal /
        similarityTotal
      : null;
      
    const weightedDirection =
        similarityWeightedReturnPct > 0
          ? "BULLISH"
          : similarityWeightedReturnPct < 0
            ? "BEARISH"
            : "NEUTRAL";

      const medianDirection =
        medianForwardReturnPct > 0
          ? "BULLISH"
          : medianForwardReturnPct < 0
            ? "BEARISH"
            : "NEUTRAL";

      const outcomeDirection =
        positiveCount > negativeCount
          ? "BULLISH"
          : positiveCount < negativeCount
            ? "BEARISH"
            : "NEUTRAL";

      const directions = [
        weightedDirection,
        medianDirection,
        outcomeDirection
      ];

      const bullishVotes =
        directions.filter(
          (direction) =>
            direction === "BULLISH"
        ).length;

      const bearishVotes =
        directions.filter(
          (direction) =>
            direction === "BEARISH"
        ).length;

      const neutralVotes =
        directions.filter(
          (direction) =>
            direction === "NEUTRAL"
        ).length;

      const allAgree =
        directions.every(
          (direction) =>
            direction === directions[0]
        );

      const direction =
        allAgree
          ? directions[0]
          : "MIXED";

  return {
      ready:
        marketMemory.ready === true,

      direction,

      agreement: {
        allAgree,

        bullishVotes,
        bearishVotes,
        neutralVotes,

        components: {
          weightedReturn:
            weightedDirection,

          medianReturn:
            medianDirection,

          outcomeRate:
            outcomeDirection
        }
      },

      matchCount:
        matches.length,

      averageForwardReturnPct,

      medianForwardReturnPct,

      positiveOutcomeRate:
        positiveCount /
        returns.length,

      negativeOutcomeRate:
        negativeCount /
        returns.length,

      similarityWeightedReturnPct,

      bestSimilarity
    };
}