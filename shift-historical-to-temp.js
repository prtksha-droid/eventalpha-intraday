const TEMP_OFFSET = 10000000000;

const result = db.candles.updateMany(
  {
    source: "GROWW_HISTORICAL"
  },
  [
    {
      $set: {
        startTimestamp: {
          $add: [
            "$startTimestamp",
            TEMP_OFFSET
          ]
        },
        endTimestamp: {
          $add: [
            "$endTimestamp",
            TEMP_OFFSET
          ]
        }
      }
    }
  ]
);

printjson({
  matchedCount: result.matchedCount,
  modifiedCount: result.modifiedCount,
  tempOffset: TEMP_OFFSET
});
