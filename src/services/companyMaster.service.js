import { Instrument } from "../models/Instrument.js";
import { Company } from "../models/Company.js";

function buildListings(instruments) {
  return instruments.map((instrument) => ({
    exchange: instrument.exchange,
    tradingSymbol: instrument.tradingSymbol,
    exchangeToken: instrument.exchangeToken,
    series: instrument.series,
    buyAllowed: instrument.buyAllowed,
    sellAllowed: instrument.sellAllowed,
    isIntraday: instrument.isIntraday
  }));
}

function selectCanonicalName(instruments) {
  const names = instruments
    .map((instrument) => instrument.name)
    .filter(Boolean)
    .sort((a, b) => b.length - a.length);

  return names[0] ?? instruments[0]?.tradingSymbol;
}

export async function syncCompanyMaster() {
  const instruments = await Instrument.find({
    isActive: true,
    isin: {
      $nin: [null, ""]
    }
  }).lean();

  const grouped = new Map();

  for (const instrument of instruments) {
    if (!grouped.has(instrument.isin)) {
      grouped.set(instrument.isin, []);
    }

    grouped.get(instrument.isin).push(instrument);
  }

  const syncTime = new Date();

  const operations = [];

  for (const [isin, groupedInstruments] of grouped.entries()) {
    const aliases = [
      ...new Set(
        groupedInstruments
          .flatMap((instrument) => [
            instrument.name,
            instrument.tradingSymbol
          ])
          .filter(Boolean)
      )
    ];

    operations.push({
      updateOne: {
        filter: {
          isin
        },

        update: {
          $set: {
            isin,
            name: selectCanonicalName(groupedInstruments),
            aliases,
            listings: buildListings(groupedInstruments),

            isActive: true,
            lastSyncedAt: syncTime
          },

          $setOnInsert: {
            classification: "UNCLASSIFIED",
            intradayEligible: false
          }
        },

        upsert: true
      }
    });
  }

  if (operations.length) {
    await Company.bulkWrite(operations, {
      ordered: false
    });
  }

  await Company.updateMany(
    {
      lastSyncedAt: {
        $lt: syncTime
      }
    },
    {
      $set: {
        isActive: false
      }
    }
  );

  const totalCompanies = await Company.countDocuments({
    isActive: true
  });

  const crossListed = await Company.countDocuments({
    isActive: true,
    "listings.1": {
      $exists: true
    }
  });

  return {
    sourceInstrumentRows: instruments.length,
    uniqueMasterRecords: totalCompanies,
    crossListedMasterRecords: crossListed,
    syncedAt: syncTime
  };
}