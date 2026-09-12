const result = db.candles.aggregate(
  [
    {
      $match: {
        interval: "5m",
        source: "GROWW_HISTORICAL",
        startTimestamp: {
          $gte: 1787665500,
          $lte: 1787673300
        }
      }
    },
    {
      $project: {
        exchange: 1,
        tradingSymbol: 1,
        open: 1,
        high: 1,
        low: 1,
        close: 1,
        volume: 1,
        correctedTimestamp: {
          $subtract: ["$startTimestamp", 19800]
        }
      }
    },
    {
      $lookup: {
        from: "candles",
        let: {
          e: "$exchange",
          t: "$tradingSymbol",
          ts: "$correctedTimestamp"
        },
        pipeline: [
          {
            $match: {
              $expr: {
                $and: [
                  { $eq: ["$exchange", "$$e"] },
                  { $eq: ["$tradingSymbol", "$$t"] },
                  { $eq: ["$interval", "5m"] },
                  { $eq: ["$startTimestamp", "$$ts"] },
                  { $eq: ["$source", "AGGREGATED_1M"] }
                ]
              }
            }
          },
          {
            $project: {
              open: 1,
              high: 1,
              low: 1,
              close: 1
            }
          },
          { $limit: 1 }
        ],
        as: "aggregated"
      }
    },
    {
      $match: {
        "aggregated.0": {
          $exists: true
        }
      }
    },
    {
      $set: {
        aggregated: {
          $arrayElemAt: ["$aggregated", 0]
        }
      }
    },
    {
      $group: {
        _id: null,
        collisions: { $sum: 1 },
        exactOHLCMatches: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ["$open", "$aggregated.open"] },
                  { $eq: ["$high", "$aggregated.high"] },
                  { $eq: ["$low", "$aggregated.low"] },
                  { $eq: ["$close", "$aggregated.close"] }
                ]
              },
              1,
              0
            ]
          }
        },
        openMatches: {
          $sum: {
            $cond: [{ $eq: ["$open", "$aggregated.open"] }, 1, 0]
          }
        },
        highMatches: {
          $sum: {
            $cond: [{ $eq: ["$high", "$aggregated.high"] }, 1, 0]
          }
        },
        lowMatches: {
          $sum: {
            $cond: [{ $eq: ["$low", "$aggregated.low"] }, 1, 0]
          }
        },
        closeMatches: {
          $sum: {
            $cond: [{ $eq: ["$close", "$aggregated.close"] }, 1, 0]
          }
        }
      }
    }
  ],
  {
    allowDiskUse: true
  }
).toArray();

printjson(result);
