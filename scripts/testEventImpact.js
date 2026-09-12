import mongoose from "mongoose";

import RawNews from "../src/models/RawNews.js";
import NewsEvent from "../src/models/NewsEvent.js";

import {
  enrichEventIntelligence,
} from "../src/services/news/eventIntelligence.service.js";

import {
  buildEventImpacts,
} from "../src/services/news/eventImpact.service.js";

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
        "RawNews not found"
      );
    }

    const event =
      await NewsEvent.findOne({
        sourceNewsIds:
          rawNews._id,
      });

    if (!event) {
      throw new Error(
        "NewsEvent not found"
      );
    }

    await enrichEventIntelligence(
      event._id
    );

    const result =
      await buildEventImpacts(
        event._id
      );

    console.log(
      JSON.stringify(
        {
          event: {
            eventId:
              result.event._id,

            headline:
              result.event.headline,

            eventType:
              result.event.eventType,

            eventSubtype:
              result.event.eventSubtype,

            themes:
              result.event.themes,

            facts:
              result.event.metadata
                ?.facts,
          },

          impacts:
            result.impacts.map(
              (impact) => ({
                companyId:
                  impact.companyId,

                exchange:
                  impact.exchange,

                symbol:
                  impact.symbol,

                relationshipType:
                  impact.relationshipType,

                direction:
                  impact.direction,

                impactStrength:
                  impact.impactStrength,

                confidence:
                  impact.confidence,

                relevance:
                  impact.relevance,

                expectedHorizon:
                  impact.expectedHorizon,

                impactStatus:
                  impact.metadata
                    ?.impactStatus,

                evidence:
                  impact.evidence,
              })
            ),
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