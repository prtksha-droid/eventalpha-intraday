const ids = [
  ObjectId("6a8de00364078304aef8fed4"),
  ObjectId("6a8de00364078304aef8fea1")
];

printjson(
  db.candles.find(
    {
      _id: {
        $in: ids
      }
    },
    {
      _id: 1,
      exchange: 1,
      tradingSymbol: 1,
      startTimestamp: 1,
      endTimestamp: 1,
      open: 1,
      high: 1,
      low: 1,
      close: 1,
      volume: 1,
      source: 1,
      createdAt: 1,
      updatedAt: 1
    }
  ).toArray()
);
