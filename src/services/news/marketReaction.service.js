import NewsEvent from "../../models/NewsEvent.js";
import EventCompanyImpact from "../../models/EventCompanyImpact.js";
import { Candle } from "../../models/Candle.js";

function toEpochSeconds(value) {
  if (!value) {
    return null;
  }

  const date =
    value instanceof Date
      ? value
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  return Math.floor(
    date.getTime() / 1000
  );
}

function calculatePercentChange(
  baseline,
  value
) {
  if (
    baseline === null ||
    baseline === undefined ||
    value === null ||
    value === undefined ||
    baseline === 0
  ) {
    return null;
  }

  return (
    ((value - baseline) /
      baseline) *
    100
  );
}

async function findBaselineCandle({
  exchange,
  tradingSymbol,
  interval,
  eventTimestamp,
}) {
  return Candle.findOne({
    exchange,
    tradingSymbol,
    interval,

    endTimestamp: {
      $lte: eventTimestamp,
    },
  })
    .sort({
      endTimestamp: -1,
    })
    .lean();
}

async function findReactionCandle({
  exchange,
  tradingSymbol,
  interval,
  targetTimestamp,
  maxObservationLagSeconds,
}) {
  const containing =
    await Candle.findOne({
      exchange,
      tradingSymbol,
      interval,

      startTimestamp: {
        $lte: targetTimestamp,
      },

      endTimestamp: {
        $gte: targetTimestamp,
      },
    })
      .sort({
        startTimestamp: 1,
      })
      .lean();

  if (containing) {
    return {
      candle: containing,
      selectionMethod:
        "CONTAINS_TARGET",
    };
  }

  const after =
    await Candle.findOne({
      exchange,
      tradingSymbol,
      interval,

      startTimestamp: {
        $gte: targetTimestamp,
      },
    })
      .sort({
        startTimestamp: 1,
      })
      .lean();

  if (after) {
      const observationLagSeconds =
        Math.max(
          0,
          after.startTimestamp -
            targetTimestamp
        );

      if (
        observationLagSeconds >
        maxObservationLagSeconds
      ) {
        return {
          candle: null,

          selectionMethod:
            "NEXT_AVAILABLE_TOO_LATE",

          observationLagSeconds,
        };
      }

      return {
        candle: after,

        selectionMethod:
          "NEXT_AVAILABLE",

        observationLagSeconds,
      };
    }

  return {
    candle: null,
    selectionMethod:
      "NOT_AVAILABLE",
  };
}

function buildReactionMeasurement({
  horizonSeconds,
  targetTimestamp,
  baseline,
  reactionResult,
}) {
  const candle =
    reactionResult.candle;

  if (!candle) {
      return {
        horizonSeconds,
        targetTimestamp,

        available: false,

        selectionMethod:
          reactionResult.selectionMethod,

        observationLagSeconds:
          reactionResult.observationLagSeconds ??
          null,
      };
    }

  const baselineClose =
    baseline.close;

  return {
    horizonSeconds,

    targetTimestamp,

    available: true,

    selectionMethod:
      reactionResult.selectionMethod,

    candleStartTimestamp:
      candle.startTimestamp,

    candleEndTimestamp:
      candle.endTimestamp,

    observationLagSeconds:
      Math.max(
        0,
        candle.startTimestamp -
          targetTimestamp
      ),

    open:
      candle.open,

    high:
      candle.high,

    low:
      candle.low,

    close:
      candle.close,

    closeReturnPct:
      calculatePercentChange(
        baselineClose,
        candle.close
      ),

    highExcursionPct:
      calculatePercentChange(
        baselineClose,
        candle.high
      ),

    lowExcursionPct:
      calculatePercentChange(
        baselineClose,
        candle.low
      ),
  };
}

export async function measureMarketReaction({
  eventId,
  interval,
  horizonsSeconds,
  maxBaselineGapSeconds,
  maxObservationLagSeconds,
}) {
  if (!eventId) {
    throw new Error(
      "eventId is required"
    );
  }

  if (!interval) {
    throw new Error(
      "interval is required"
    );
  }

  if (
      !Array.isArray(
        horizonsSeconds
      ) ||
      !horizonsSeconds.length
    ) {
      throw new Error(
        "horizonsSeconds must contain at least one horizon"
      );
    }

    if (
      !Number.isFinite(
        maxBaselineGapSeconds
      ) ||
      maxBaselineGapSeconds < 0
    ) {
      throw new Error(
        "maxBaselineGapSeconds must be provided"
      );
    }

    if (
      !Number.isFinite(
        maxObservationLagSeconds
      ) ||
      maxObservationLagSeconds < 0
    ) {
      throw new Error(
        "maxObservationLagSeconds must be provided"
      );
    }

  const event =
    await NewsEvent.findById(
      eventId
    ).lean();

  if (!event) {
    throw new Error(
      `NewsEvent not found: ${eventId}`
    );
  }

  const eventTimestamp =
    toEpochSeconds(
      event.occurredAt ||
        event.firstPublishedAt
    );

  if (!eventTimestamp) {
    throw new Error(
      `Event ${eventId} does not have a valid timestamp`
    );
  }

  const impacts =
    await EventCompanyImpact.find({
      eventId,
    });

  const results = [];

  for (const impact of impacts) {
    const baseline =
      await findBaselineCandle({
        exchange:
          impact.exchange,

        tradingSymbol:
          impact.symbol,

        interval,

        eventTimestamp,
      });

    if (!baseline) {
      results.push({
        impactId:
          impact._id,

        exchange:
          impact.exchange,

        symbol:
          impact.symbol,

        interval,

        status:
          "NO_BASELINE_CANDLE",

        eventTimestamp,

        reactions: [],
      });

      continue;
    }
    const baselineGapSeconds =
      eventTimestamp -
      baseline.endTimestamp;

    if (
      baselineGapSeconds >
      maxBaselineGapSeconds
    ) {
      results.push({
        impactId:
          impact._id,

        exchange:
          impact.exchange,

        symbol:
          impact.symbol,

        interval,

        status:
          "STALE_BASELINE_CANDLE",

        eventTimestamp,

        baselineGapSeconds,

        maxBaselineGapSeconds,

        baseline,

        reactions: [],
      });

      impact.metadata = {
        ...(impact.metadata || {}),

        marketReaction: {
          interval,
          eventTimestamp,

          status:
            "STALE_BASELINE_CANDLE",

          baselineGapSeconds,
          maxBaselineGapSeconds,
        },

        impactStatus:
          "MARKET_EVIDENCE_UNAVAILABLE",
      };

      await impact.save();

      continue;
    }
    const reactions = [];

    for (
      const horizonSeconds
      of horizonsSeconds
    ) {
      const targetTimestamp =
        eventTimestamp +
        horizonSeconds;

      const reactionResult =
          await findReactionCandle({
            exchange:
              impact.exchange,

            tradingSymbol:
              impact.symbol,

            interval,

            targetTimestamp,

            maxObservationLagSeconds,
          });

      reactions.push(
        buildReactionMeasurement({
          horizonSeconds,
          targetTimestamp,
          baseline,
          reactionResult,
        })
      );
    }

    const availableReactions =
      reactions.filter(
        (reaction) =>
          reaction.available
      );

    const reactionEvidence = {
      type:
        "MARKET_REACTION",

      interval,

      eventTimestamp,

      baseline: {
        startTimestamp:
          baseline.startTimestamp,

        endTimestamp:
          baseline.endTimestamp,

        open:
          baseline.open,

        high:
          baseline.high,

        low:
          baseline.low,

        close:
          baseline.close,
      },

      reactions,
    };

    const existingEvidence =
      Array.isArray(
        impact.evidence
      )
        ? impact.evidence
        : [];

    impact.evidence = [
      ...existingEvidence.filter(
        (item) =>
          item?.type !==
          "MARKET_REACTION"
      ),

      reactionEvidence,
    ];

    impact.metadata = {
      ...(impact.metadata || {}),

      marketReaction: {
        interval,

        eventTimestamp,

        requestedHorizons:
          horizonsSeconds,

        availableHorizons:
          availableReactions.length,

        totalHorizons:
          horizonsSeconds.length,
      },

      impactStatus:
        availableReactions.length
          ? "MARKET_EVIDENCE_AVAILABLE"
          : "MARKET_EVIDENCE_UNAVAILABLE",
    };

    await impact.save();

    results.push({
      impactId:
        impact._id,

      exchange:
        impact.exchange,

      symbol:
        impact.symbol,

      interval,

      status:
        availableReactions.length
          ? "MARKET_EVIDENCE_AVAILABLE"
          : "MARKET_EVIDENCE_UNAVAILABLE",

      eventTimestamp,

      baseline,

      reactions,
    });
  }

  return {
    eventId,
    interval,
    horizonsSeconds,
    results,
  };
}