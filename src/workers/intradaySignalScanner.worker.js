import "dotenv/config";

import { connectMongo } from "../config/mongo.js";
import { connectRedis } from "../config/redis.js";
import {
  getIntradaySignalScannerConfig
} from "../config/intradaySignalScanner.js";
import {
  runIntradaySignalScannerCycle
} from "../services/intradaySignalScanner.service.js";

async function startWorker() {
  await connectMongo();
  await connectRedis();

  const config =
    getIntradaySignalScannerConfig();

  const pollIntervalMilliseconds =
    config.pollSeconds * 1000;

  console.log(
    "Intraday signal scanner worker started"
  );

  while (true) {
    try {
      const result =
        await runIntradaySignalScannerCycle();

      console.log(
        "Intraday signal scanner cycle:",
        result
      );
    } catch (error) {
      console.error(
        "Intraday signal scanner cycle failed:",
        error
      );
    }

    await new Promise(
      (resolve) =>
        setTimeout(
          resolve,
          pollIntervalMilliseconds
        )
    );
  }
}

startWorker().catch((error) => {
  console.error(
    "Intraday signal scanner worker failed:",
    error
  );

  process.exit(1);
});