import mongoose from "mongoose";

import RawNews from "../src/models/RawNews.js";
import NewsEvent from "../src/models/NewsEvent.js";

import {
  measureMarketReaction,
} from "../src/services/news/marketReaction.service.js";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/eventalpha_intraday";

function parseHorizons(value) {
  if (!value) {
    throw new Error(
      "REACTION_HORIZONS_SECONDS is required"
    );
  }

  const horizons =
    value
      .split(",")
      .map((item) =>
        Number(item.trim())
      )
      .filter(
        (item) =>
          Number.isFinite(item) &&
          item > 0
      );

  if (!horizons.length) {
    throw new Error(
      "REACTION_HORIZONS_SECONDS contains no valid values"
    );
  }

  return horizons;
}
function parseRequiredNumber(
  value,
  name
) {
  const parsed = Number(value);

  if (
    !Number.isFinite(parsed) ||
    parsed < 0
  ) {
    throw new Error(
      `${name} must be a valid non-negative number`
    );
  }

  return parsed;
}
async function run() {
  try {
    const interval =
      process.env.REACTION_INTERVAL;

    if (!interval) {
      throw new Error(
        "REACTION_INTERVAL is required"
      );
    }

    const horizonsSeconds =
      parseHorizons(
        process.env
          .REACTION_HORIZONS_SECONDS
      );
    const maxBaselineGapSeconds =
      parseRequiredNumber(
        process.env
          .MAX_BASELINE_GAP_SECONDS,

        "MAX_BASELINE_GAP_SECONDS"
      );

    const maxObservationLagSeconds =
      parseRequiredNumber(
        process.env
          .MAX_OBSERVATION_LAG_SECONDS,

        "MAX_OBSERVATION_LAG_SECONDS"
      );
    await mongoose.connect(
      mongoUri
    );

    console.log(
      "MongoDB connected"
    );

    const testEventId =
      process.env.TEST_EVENT_ID;

    let event;

    if (testEventId) {
      event =
        await NewsEvent.findById(
          testEventId
        );
    } else {
      const rawNews =
        await RawNews.findOne({
          externalId:
            "api-news-001",
        });

      if (!rawNews) {
        throw new Error(
          "RawNews test record not found"
        );
      }

      event =
        await NewsEvent.findOne({
          sourceNewsIds:
            rawNews._id,
        });
    }

    if (!event) {
      throw new Error(
        "NewsEvent test record not found"
      );
    }

    const result =
      await measureMarketReaction({
        eventId:
          event._id,

        interval,

        horizonsSeconds,

        maxBaselineGapSeconds,

        maxObservationLagSeconds,
      });

    console.log(
      JSON.stringify(
        result,
        null,
        2
      )
    );
  } catch (error) {
    console.error(error);
    process.exitCode = 1;
  } finally {
    await mongoose.disconnect();
  }
}

run();