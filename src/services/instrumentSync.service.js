import { Instrument } from "../models/Instrument.js";
import { fetchGrowwInstruments } from "../providers/groww/instrument.provider.js";

export async function syncInstrumentMaster() {
  const rows = await fetchGrowwInstruments();

  const supportedExchanges = new Set(["NSE", "BSE"]);

  const cashRows = rows.filter((row) => {
    return (
      row.segment === "CASH" &&
      supportedExchanges.has(row.exchange)
    );
  });

  const syncTime = new Date();

  const operations = cashRows.map((row) => ({
    updateOne: {
      filter: {
        exchange: row.exchange,
        tradingSymbol: row.trading_symbol,
        segment: row.segment
      },

      update: {
        $set: {
          exchange: row.exchange,
          exchangeToken: row.exchange_token,
          tradingSymbol: row.trading_symbol,
          growwSymbol: row.groww_symbol,
          name: row.name,
          instrumentType: row.instrument_type,
          segment: row.segment,
          series: row.series || null,
          isin: row.isin || null,

          buyAllowed: String(row.buy_allowed) === "1",
          sellAllowed: String(row.sell_allowed) === "1",
          isIntraday: String(row.is_intraday).toLowerCase() === "true" ||
            String(row.is_intraday) === "1",
          isActive: true,
          source: "GROWW",
          lastSyncedAt: syncTime
        }
      },

      upsert: true
    }
  }));

  if (operations.length) {
    await Instrument.bulkWrite(operations, {
      ordered: false
    });
  }

  await Instrument.updateMany(
    {
      source: "GROWW",
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

  const total = await Instrument.countDocuments({
    isActive: true
  });

  const nse = await Instrument.countDocuments({
    exchange: "NSE",
    isActive: true
  });

  const bse = await Instrument.countDocuments({
    exchange: "BSE",
    isActive: true
  });

  return {
    downloaded: rows.length,
    eligibleCashRows: cashRows.length,
    activeInstruments: total,
    nse,
    bse,
    syncedAt: syncTime
  };
}