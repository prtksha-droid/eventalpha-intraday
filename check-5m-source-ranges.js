printjson(
  db.candles.aggregate([
    {
      $match: {
        interval: "5m"
      }
    },
    {
      $group: {
        _id: "$source",
        count: { $sum: 1 },
        earliest: { $min: "$startTimestamp" },
        latest: { $max: "$startTimestamp" }
      }
    },
    {
      $sort: {
        count: -1
      }
    }
  ]).toArray()
);
