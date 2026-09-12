printjson(
  db.candles.find(
    {
      exchange: "BSE",
      tradingSymbol: "SUPRIYA",
      interval: "5m",
      source: "GROWW_HISTORICAL",
      startTimestamp: {
        $gte: 1787647500,
        $lte: 1787669700
      }
    },
    {
      _id: 1,
      startTimestamp: 1,
      endTimestamp: 1,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1
    }
  )
  .sort({
    startTimestamp: 1
  })
  .toArray()
);
