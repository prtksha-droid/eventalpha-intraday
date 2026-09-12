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
              constituentCandles: 1,
              volume: 1
            }
          },
          { $limit: 1 }
        ],
        as: "existing"
      }
    },
    {
      $unwind: "$existing"
    },
    {
      $group: {
        _id: {
          constituentCandles:
            "$existing.constituentCandles"
        },
        count: {
          $sum: 1
        },
        withVolume: {
          $sum: {
            $cond: [
              { $ne: ["$existing.volume", null] },
              1,
              0
            ]
          }
        }
      }
    },
    {
      $sort: {
        "_id.constituentCandles": 1
      }
    }
  ],
  {
    allowDiskUse: true
  }
).toArray();

printjson(result);
