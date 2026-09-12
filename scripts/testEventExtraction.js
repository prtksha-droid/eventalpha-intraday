import mongoose from "mongoose";

import RawNews from "../src/models/RawNews.js";

import {
  processRawNewsEvent,
} from "../src/services/news/eventProcessing.service.js";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/eventalpha_intraday";

async function run() {
  try {
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

    const rawNews = await RawNews.findOne({
      externalId: "api-news-001",
    });

    if (!rawNews) {
      throw new Error(
        "Test RawNews record not found"
      );
    }

    const result =
      await processRawNewsEvent(
        rawNews._id
      );

    console.log(
      JSON.stringify(
        {
          created: result.created,
          duplicate: result.duplicate,
          eventId: result.event._id,
          eventKey: result.event.eventKey,
          headline: result.event.headline,
          extractionMethod:
            result.event.extractionMethod,
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