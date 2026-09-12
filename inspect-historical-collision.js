const cursor = db.candles.find({
  interval: "5m",
  source: "GROWW_HISTORICAL",
  startTimestamp: {
    $gte: 1787665500,
    $lte: 1787673300
  }
});

let found = false;

while (cursor.hasNext()) {
  const historical = cursor.next();

  const correctedTimestamp =
    historical.startTimestamp - 19800;

  const existing = db.candles.findOne({
    exchange: historical.exchange,
    tradingSymbol: historical.tradingSymbol,
    interval: "5m",
    startTimestamp: correctedTimestamp,
    source: "GROWW_HISTORICAL"
  });

  if (existing) {
    printjson({
      buggyHistorical: historical,
      correctedTimestamp:
        correctedTimestamp,
      existingHistorical:
        existing
    });

    found = true;
    break;
  }
}

if (!found) {
  print("NO_COLLISION_FOUND");
}
