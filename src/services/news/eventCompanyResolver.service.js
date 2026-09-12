import RawNews from "../../models/RawNews.js";
import NewsEvent from "../../models/NewsEvent.js";
import EventCompanyImpact from "../../models/EventCompanyImpact.js";

import {
  resolveCompaniesFromText,
} from "./companyEntityResolver.service.js";

function buildSearchableText(rawNews) {
  return [
    rawNews.title,
    rawNews.description,
    rawNews.content,
  ]
    .filter(Boolean)
    .join(" ");
}

function buildEventEntity(match) {
  return {
    type: "COMPANY",
    value: match.name,
    normalizedValue: match.isin,
  };
}

function buildImpactEvidence(match) {
  return [
    {
      type: "DIRECT_TEXT_MATCH",

      matchedAlias:
        match.matchedAlias,

      matchedAliases:
        match.matchedAliases,

      resolutionMethod:
        match.resolutionMethod,

      isin:
        match.isin,
    },
  ];
}

export async function resolveEventCompanies(
  eventId
) {
  const event =
    await NewsEvent.findById(eventId);

  if (!event) {
    throw new Error(
      `NewsEvent not found: ${eventId}`
    );
  }

  const rawNewsDocuments =
    await RawNews.find({
      _id: {
        $in: event.sourceNewsIds,
      },
    }).lean();

  if (!rawNewsDocuments.length) {
    throw new Error(
      `No RawNews records found for event ${eventId}`
    );
  }

  const combinedText =
    rawNewsDocuments
      .map(buildSearchableText)
      .join(" ");

  const companyMatches =
    await resolveCompaniesFromText(
      combinedText
    );

  const entities =
    companyMatches.map(
      buildEventEntity
    );

  event.entities = entities;

  await event.save();

  const impacts = [];

  for (const match of companyMatches) {
    for (const listing of match.listings) {
      if (
        !listing.exchange ||
        !listing.tradingSymbol
      ) {
        continue;
      }

      const impact =
          await EventCompanyImpact.findOneAndUpdate(
            {
              eventId: event._id,
              symbol: listing.tradingSymbol,
              exchange: listing.exchange,
            },
            {
              $set: {
                companyId: match.companyId,

                relationshipType: "DIRECT",

                reasoning: [
                  `Company resolved directly from news text using alias: ${match.matchedAlias}`,
                ],

                evidence: buildImpactEvidence(match),

                metadata: {
                  isin: match.isin,
                  companyName: match.name,
                  sector: match.sector,
                  industry: match.industry,
                  classification: match.classification,
                  intradayEligible: match.intradayEligible,

                  listing: {
                    exchange: listing.exchange,
                    tradingSymbol: listing.tradingSymbol,
                    exchangeToken: listing.exchangeToken,
                    series: listing.series,
                    buyAllowed: listing.buyAllowed,
                    sellAllowed: listing.sellAllowed,
                    isIntraday: listing.isIntraday,
                  },
                },
              },

              $setOnInsert: {
                eventId: event._id,
                symbol: listing.tradingSymbol,
                exchange: listing.exchange,
              },
            },
            {
              returnDocument: "after",
              upsert: true,
              setDefaultsOnInsert: true,
            }
          );

      impacts.push(impact);
    }
  }

  return {
    event,
    companies:
      companyMatches,

    impacts,
  };
}