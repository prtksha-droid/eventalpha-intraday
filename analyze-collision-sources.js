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
                  { $eq: ["$startTimestamp", "$$ts"] }
                ]
              }
            }
          },
          {
            $project: {
              source: 1
            }
          }
        ],
        as: "existing"
      }
    },
    {
      $unwind: "$existing"
    },
    {
      $group: {
        _id: "$existing.source",
        collisions: {
          $sum: 1
        }
      }
    },
    {
      $sort: {
        collisions: -1
      }
    }
  ],
  {
    allowDiskUse: true
  }
).toArray();

printjson(result);
