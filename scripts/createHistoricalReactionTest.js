import mongoose from "mongoose";

import NewsEvent from "../src/models/NewsEvent.js";
import EventCompanyImpact from "../src/models/EventCompanyImpact.js";
import { Company } from "../src/models/Company.js";

const mongoUri =
  process.env.MONGODB_URI ||
  "mongodb://localhost:27017/eventalpha_intraday";

async function run() {
  try {
    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");

    const company =
      await Company.findOne({
        isin: "INE002A01018",
      });

    if (!company) {
      throw new Error(
        "Reliance company not found"
      );
    }

    const eventTimestamp =
      1787729400;

    const eventDate =
      new Date(
        eventTimestamp * 1000
      );

    const event =
      await NewsEvent.findOneAndUpdate(
        {
          eventKey:
            "TEST_MARKET_REACTION_RELIANCE",
        },
        {
          $set: {
            headline:
              "Market reaction validation test",

            summary:
              "Controlled historical event used to validate market reaction calculations.",

            occurredAt:
              eventDate,

            firstPublishedAt:
              eventDate,

            latestPublishedAt:
              eventDate,

            eventType:
              "TEST_EVENT",

            eventSubtype:
              "TEST",

            themes: [
              "MARKET_REACTION_TEST",
            ],

            extractionMethod:
              "CONTROLLED_TEST",

            processingVersion:
              "v1",

            metadata: {
              testOnly: true,
            },
          },

          $setOnInsert: {
            eventKey:
              "TEST_MARKET_REACTION_RELIANCE",
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );

    const listings = [
      {
        exchange: "NSE",
        symbol: "RELIANCE",
      },
      {
        exchange: "BSE",
        symbol: "RELIANCE",
      },
    ];

    for (const listing of listings) {
      await EventCompanyImpact.findOneAndUpdate(
        {
          eventId:
            event._id,

          exchange:
            listing.exchange,

          symbol:
            listing.symbol,
        },
        {
          $set: {
            companyId:
              company._id,

            relationshipType:
              "DIRECT",

            metadata: {
              testOnly: true,
              impactStatus:
                "AWAITING_EVIDENCE",
            },
          },

          $setOnInsert: {
            eventId:
              event._id,

            exchange:
              listing.exchange,

            symbol:
              listing.symbol,
          },
        },
        {
          upsert: true,
          returnDocument: "after",
        }
      );
    }

    console.log(
      JSON.stringify(
        {
          eventId:
            event._id,

          eventKey:
            event.eventKey,

          occurredAt:
            event.occurredAt,

          eventTimestamp,

          companyId:
            company._id,

          company:
            company.name,
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