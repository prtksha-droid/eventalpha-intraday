const historicalSource = "GROWW_HISTORICAL";

const result = db.candles.aggregate(
  [
    {
      $match: {
        interval: "5m",
        source: historicalSource
      }
    },
    {
      $project: {
        exchange: 1,
        tradingSymbol: 1,
        correctedTimestamp: {
          $subtract: [
            "$startTimestamp",
            19800
          ]
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
                  { $eq: ["$startTimestamp", "$$ts"] }
                ]
              }
            }
          },
          { $limit: 1 }
        ],
        as: "existing"
      }
    },
    {
      $match: {
        "existing.0": {
          $exists: true
        }
      }
    },
    {
      $count: "collisions"
    }
  ],
  {
    allowDiskUse: true
  }
).toArray();

printjson(result);
