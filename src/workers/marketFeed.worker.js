import "dotenv/config";

import { connectMongo } from "../config/mongo.js";
import { connectRedis } from "../config/redis.js";
import { getIntradayMarketListings } from "../services/marketUniverse.service.js";
import { shardItems } from "../utils/shard.js";

async function startWorker() {
  const shardId = Number(process.env.FEED_SHARD_ID);
  const shardSize = Number(process.env.MARKET_FEED_MAX_SUBSCRIPTIONS);

  if (!Number.isInteger(shardId)) {
    throw new Error("FEED_SHARD_ID is required");
  }

  if (!Number.isInteger(shardSize) || shardSize <= 0) {
    throw new Error("MARKET_FEED_MAX_SUBSCRIPTIONS is required");
  }

  await connectMongo();
  await connectRedis();

  const listings = await getIntradayMarketListings();

  const shards = shardItems(listings, shardSize);

  const assignedListings = shards[shardId];

  if (!assignedListings) {
    throw new Error(
      `Shard ${shardId} does not exist. Available shards: ${shards.length}`
    );
  }

  console.log(
    `Market feed worker ${shardId} assigned ${assignedListings.length} instruments`
  );

  const nseCount = assignedListings.filter(
    (item) => item.exchange === "NSE"
  ).length;

  const bseCount = assignedListings.filter(
    (item) => item.exchange === "BSE"
  ).length;

  console.log({
    shardId,
    total: assignedListings.length,
    nse: nseCount,
    bse: bseCount
  });

  // Groww streaming connection comes next.
  // Keep process alive for now.
  setInterval(() => {}, 60_000);
}

startWorker().catch((error) => {
  console.error("Market feed worker failed:", error);
  process.exit(1);
});