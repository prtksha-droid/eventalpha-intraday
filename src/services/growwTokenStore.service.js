import {
  getRedisClient
} from "../config/redis.js";

function getGrowwTokenRedisKey() {
  const key =
    process.env
      .GROWW_ACCESS_TOKEN_REDIS_KEY
      ?.trim();

  if (!key) {
    throw new Error(
      "GROWW_ACCESS_TOKEN_REDIS_KEY is required"
    );
  }

  return key;
}

export async function publishGrowwAccessToken() {
  const token =
    process.env
      .GROWW_ACCESS_TOKEN
      ?.trim();

  if (!token) {
    throw new Error(
      "GROWW_ACCESS_TOKEN is required"
    );
  }

  const redisClient =
    getRedisClient();

  const redisKey =
    getGrowwTokenRedisKey();

  await redisClient.set(
    redisKey,
    token
  );

  console.log(
    `[GrowwAuth] Access token synced to Redis key ${redisKey}`
  );
}