import mongoose from "mongoose";
import { ingestNewsItem } from "../src/services/news/newsIngestion.service.js";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/eventalpha_intraday";

async function run() {
  try {
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

    const input = {
      source: "TEST_SOURCE",
      externalId: "news-test-001",

      title:
        "Tata Motors announces new EV platform",

      description:
        "Tata Motors announces a new electric vehicle platform.",

      content:
        "The company said the platform will support future electric vehicles.",

      publishedAt: new Date(),

      language: "en",
    };

    const result = await ingestNewsItem(input);

    console.log(
      JSON.stringify(
        {
          inserted: result.inserted,
          duplicate: result.duplicate,
          id: result.document._id,
          fingerprint: result.document.fingerprint,
          processingStatus:
            result.document.processingStatus,
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