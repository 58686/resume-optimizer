import type { NextResponse } from "next/server";
import { getRedisClient } from "@/lib/redis";

type RateLimitPolicy = {
  key: string;
  limit: number;
  windowMs: number;
};

export type RateLimitResult = {
  allowed: boolean;
  limit: number;
  remaining: number;
  resetAt: number;
  retryAfterSeconds: number;
};

const rateLimitLua = `
local current = redis.call("INCR", KEYS[1])
if current == 1 then
  redis.call("PEXPIRE", KEYS[1], ARGV[1])
end
local ttl = redis.call("PTTL", KEYS[1])
return { current, ttl }
`;

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers.get("x-forwarded-for");
  if (forwardedFor) {
    return forwardedFor.split(",")[0]?.trim() || "unknown";
  }

  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-vercel-forwarded-for") ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function checkRateLimit(policy: RateLimitPolicy): Promise<RateLimitResult> {
  const now = Date.now();
  const redis = getRedisClient();
  const redisKey = `rate-limit:${policy.key}`;
  const [currentRaw, ttlRaw] = (await redis.eval(rateLimitLua, 1, redisKey, policy.windowMs)) as [
    number | string,
    number | string
  ];

  const current = Number(currentRaw);
  const ttlMs = Math.max(Number(ttlRaw), 0);
  const remaining = Math.max(0, policy.limit - current);
  const allowed = current <= policy.limit;
  const resetAt = now + ttlMs;

  return {
    allowed,
    limit: policy.limit,
    remaining,
    resetAt,
    retryAfterSeconds: allowed ? 0 : Math.max(1, Math.ceil(ttlMs / 1000))
  };
}

export function createRateLimitHeaders(result: RateLimitResult) {
  return {
    "X-RateLimit-Limit": String(result.limit),
    "X-RateLimit-Remaining": String(result.remaining),
    "X-RateLimit-Reset": String(Math.ceil(result.resetAt / 1000)),
    ...(result.allowed ? {} : { "Retry-After": String(result.retryAfterSeconds) })
  };
}

export function applyRateLimitHeaders(response: NextResponse, result: RateLimitResult) {
  const headers = createRateLimitHeaders(result);

  for (const [key, value] of Object.entries(headers)) {
    response.headers.set(key, value);
  }

  return response;
}
