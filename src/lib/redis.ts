import IORedis from "ioredis";
import { env } from "@/lib/env";

let redisClient: IORedis | null = null;

export function createRedisConnection() {
  return new IORedis(env.REDIS_URL, {
    maxRetriesPerRequest: null,
    enableReadyCheck: false
  });
}

export function getRedisClient() {
  if (!redisClient) {
    redisClient = createRedisConnection();
  }

  return redisClient;
}
