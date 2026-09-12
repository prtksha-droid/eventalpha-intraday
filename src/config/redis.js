import { createClient } from "redis";

let redisClient;

export async function connectRedis() {
  const url = process.env.REDIS_URL;

  if (!url) {
    throw new Error("REDIS_URL is required");
  }

  redisClient = createClient({
    url
  });

  redisClient.on("error", (error) => {
    console.error("Redis error:", error);
  });

  await redisClient.connect();

  console.log("Redis connected");

  return redisClient;
}

export function getRedisClient() {
  if (!redisClient) {
    throw new Error("Redis client is not initialized");
  }

  return redisClient;
}