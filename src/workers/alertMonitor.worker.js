import "dotenv/config";

import { connectMongo } from "../config/mongo.js";
import { connectRedis } from "../config/redis.js";
import { runAlertMonitorCycle } from "../services/alertMonitor.service.js";

function getPollIntervalMilliseconds() {
  const rawValue =
    process.env.ALERT_MONITOR_POLL_SECONDS;

  const seconds =
    Number(rawValue);

  if (
    !Number.isFinite(seconds) ||
    seconds <= 0
  ) {
    throw new Error(
      "ALERT_MONITOR_POLL_SECONDS must be a positive number"
    );
  }

  return seconds * 1000;
}

async function startWorker() {
  await connectMongo();
  await connectRedis();

  const pollIntervalMilliseconds =
    getPollIntervalMilliseconds();

  console.log(
    "Alert monitor worker started"
  );

  while (true) {
    try {
      const result =
        await runAlertMonitorCycle();

      console.log(
        "Alert monitor cycle:",
        result
      );
    } catch (error) {
      console.error(
        "Alert monitor cycle failed:",
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
    "Alert monitor worker failed:",
    error
  );

  process.exit(1);
});