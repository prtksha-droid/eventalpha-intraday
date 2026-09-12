import mongoose from "mongoose";

import RawNews from "../src/models/RawNews.js";
import NewsEvent from "../src/models/NewsEvent.js";

import {
  resolveEventCompanies,
} from "../src/services/news/eventCompanyResolver.service.js";

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
        "RawNews test record not found"
      );
    }

    const event =
      await NewsEvent.findOne({
        sourceNewsIds:
          rawNews._id,
      });

    if (!event) {
      throw new Error(
        "NewsEvent not found. Run event extraction first."
      );
    }

    const result =
      await resolveEventCompanies(
        event._id
      );

    console.log(
      JSON.stringify(
        {
          eventId:
            result.event._id,

          headline:
            result.event.headline,

          companies:
            result.companies.map(
              (company) => ({
                companyId:
                  company.companyId,

                isin:
                  company.isin,

                name:
                  company.name,

                matchedAlias:
                  company.matchedAlias,

                intradayEligible:
                  company.intradayEligible,

                listings:
                  company.listings.map(
                    (listing) => ({
                      exchange:
                        listing.exchange,

                      symbol:
                        listing.tradingSymbol,

                      series:
                        listing.series,

                      isIntraday:
                        listing.isIntraday,
                    })
                  ),
              })
            ),

          impacts:
            result.impacts.map(
              (impact) => ({
                impactId:
                  impact._id,

                companyId:
                  impact.companyId,

                exchange:
                  impact.exchange,

                symbol:
                  impact.symbol,

                relationshipType:
                  impact.relationshipType,
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