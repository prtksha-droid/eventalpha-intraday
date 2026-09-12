import { Instrument } from "../models/Instrument.js";
import { Company } from "../models/Company.js";
import { getSecurityClassificationConfig } from "../config/securityClassification.js";

export async function buildIntradayUniverse() {
  const config = getSecurityClassificationConfig();

  if (!config.companyEquityIsinPrefixes.length) {
    throw new Error(
      "COMPANY_EQUITY_ISIN_PREFIXES configuration is required"
    );
  }

  const prefixRegex = new RegExp(
    `^(${config.companyEquityIsinPrefixes.join("|")})`
  );

  const instruments = await Instrument.find({
    isActive: true,
    isIntraday: true,
    isin: {
      $regex: prefixRegex
    }
  }).lean();

  const groupedByIsin = new Map();

  for (const instrument of instruments) {
    if (!groupedByIsin.has(instrument.isin)) {
      groupedByIsin.set(instrument.isin, []);
    }

    groupedByIsin.get(instrument.isin).push(instrument);
  }

  const operations = [];

  for (const [isin, listings] of groupedByIsin.entries()) {
    operations.push({
      updateOne: {
        filter: {
          isin
        },

        update: {
          $set: {
            classification: "COMPANY_EQUITY",

            intradayEligible: true,

            classificationEvidence: [
              "provider:is_intraday",
              `isin-prefix:${isin.substring(0, 3)}`
            ],

            listings: listings.map((listing) => ({
              exchange: listing.exchange,
              tradingSymbol: listing.tradingSymbol,
              exchangeToken: listing.exchangeToken,
              series: listing.series,
              buyAllowed: listing.buyAllowed,
              sellAllowed: listing.sellAllowed,
              isIntraday: listing.isIntraday
            }))
          }
        }
      }
    });
  }

  if (operations.length) {
    await Company.bulkWrite(operations, {
      ordered: false
    });
  }

  /*
   * Anything not selected by this universe build remains unavailable
   * for the company-equity intraday scanner.
   */
  await Company.updateMany(
    {
      isActive: true,
      isin: {
        $not: prefixRegex
      }
    },
    {
      $set: {
        intradayEligible: false
      }
    }
  );

  return {
    sourceListings: instruments.length,
    uniqueCompanies: groupedByIsin.size
  };
}