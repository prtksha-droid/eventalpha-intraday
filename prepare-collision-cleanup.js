const candidates = db.candles.aggregate(
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
        ids: {
          $addToSet: "$collision._id"
        }
      }
    }
  ],
  {
    allowDiskUse: true
  }
).toArray();

if (!candidates.length) {
  throw new Error(
    "Safety check failed: no collision records found"
  );
}

const ids = candidates[0].ids;

if (ids.length !== 17751) {
  throw new Error(
    "Safety check failed: expected 17751 collisions, found " +
    ids.length
  );
}

print(
  "Verified deletion set: " +
  ids.length +
  " AGGREGATED_1M candles"
);

print(
  "SCRIPT PREPARED - NO DELETE EXECUTED"
);

const deleteResult = db.candles.deleteMany({
  _id: {
    $in: ids
  }
});

print(
  "Deleted AGGREGATED_1M collisions: " +
  deleteResult.deletedCount
);

if (deleteResult.deletedCount !== 17751) {
  throw new Error(
    "Unexpected deletion count: " +
    deleteResult.deletedCount
  );
}
