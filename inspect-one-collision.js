const historical = db.candles.findOne({
  interval: "5m",
  source: "GROWW_HISTORICAL",
  startTimestamp: {
    $gte: 1787665500,
    $lte: 1787673300
  }
});

if (!historical) {
  print("NO_HISTORICAL_CANDLE");
} else {
  const correctedTimestamp =
    historical.startTimestamp - 19800;

  const existing = db.candles.findOne({
    exchange: historical.exchange,
    tradingSymbol: historical.tradingSymbol,
    interval: "5m",
    startTimestamp: correctedTimestamp
  });

  printjson({
    historical: historical,
    correctedTimestamp:
      correctedTimestamp,
    existingAtCorrectedTimestamp:
      existing
  });
}
