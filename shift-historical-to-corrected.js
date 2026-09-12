const TEMP_OFFSET = 10000000000;
const IST_CORRECTION = 19800;
const FINAL_ADJUSTMENT =
  TEMP_OFFSET + IST_CORRECTION;

const result = db.candles.updateMany(
  {
    source: "GROWW_HISTORICAL",
    startTimestamp: {
      $gte: TEMP_OFFSET
    }
  },
  [
    {
      $set: {
        startTimestamp: {
          $subtract: [
            "$startTimestamp",
            FINAL_ADJUSTMENT
          ]
        },
        endTimestamp: {
          $subtract: [
            "$endTimestamp",
            FINAL_ADJUSTMENT
          ]
        }
      }
    }
  ]
);

printjson({
  matchedCount: result.matchedCount,
  modifiedCount: result.modifiedCount,
  correctionSeconds: IST_CORRECTION
});
