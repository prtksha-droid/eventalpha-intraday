import mongoose from "mongoose";

import RawNews from "../src/models/RawNews.js";
import NewsEvent from "../src/models/NewsEvent.js";

import {
  enrichEventIntelligence,
} from "../src/services/news/eventIntelligence.service.js";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/eventalpha_intraday";

async function run() {
  try {
    await mongoose.connect(
      mongoUri
    );

    console.log(
      "MongoDB connected"
    );

    const rawNews =
      await RawNews.findOne({
        externalId:
          "api-news-001",
      });

    if (!rawNews) {
      throw new Error(
        "RawNews record not found"
      );
    }

    const event =
      await NewsEvent.findOne({
        sourceNewsIds:
          rawNews._id,
      });

    if (!event) {
      throw new Error(
        "NewsEvent record not found"
      );
    }

    const result =
      await enrichEventIntelligence(
        event._id
      );

    console.log(
      JSON.stringify(
        {
          eventId:
            result.event._id,

          headline:
            result.event.headline,

          matched:
            result.classification
              .matched,

          selectedEventType:
            result.selectedEventType,

          direction:
            result.direction,
        },
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