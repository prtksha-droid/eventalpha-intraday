const historical = db.candles.aggregate(
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
              _id: 1
            }
          }
        ],
        as: "collision"
      }
    },
    {
      $unwind: "$collision"
    },
    {
      $group: {
        _id: null,
        count: {
          $sum: 1
        },
        uniqueIds: {
          $addToSet: "$collision._id"
        }
      }
    },
    {
      $project: {
        _id: 0,
        collisionCount: "$count",
        uniqueCollisionIds: {
          $size: "$uniqueIds"
        }
      }
    }
  ],
  {
    allowDiskUse: true
  }
).toArray();

printjson(historical);
