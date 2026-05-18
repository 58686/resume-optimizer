import { apiSuccess } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";
import { getRedisClient } from "@/lib/redis";

export const runtime = "nodejs";

type HealthComponent = {
  status: "ok" | "error";
  latencyMs: number;
  message?: string;
};

function getHealthErrorMessage(error: unknown) {
  if (process.env.NODE_ENV === "production") {
    return "Health check failed";
  }

  return error instanceof Error ? error.message : "Unknown health check failure";
}

async function withTimeout(check: () => Promise<void>, timeoutMs: number) {
  let timeoutId: ReturnType<typeof setTimeout> | undefined;

  try {
    await Promise.race([
      check(),
      new Promise<never>((_, reject) => {
        timeoutId = setTimeout(() => reject(new Error(`Health check timed out after ${timeoutMs}ms`)), timeoutMs);
      })
    ]);
  } finally {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  }
}

async function measure(check: () => Promise<void>): Promise<HealthComponent> {
  const startedAt = performance.now();

  try {
    await withTimeout(check, 2000);
    return {
      status: "ok",
      latencyMs: Math.round(performance.now() - startedAt)
    };
  } catch (error) {
    return {
      status: "error",
      latencyMs: Math.round(performance.now() - startedAt),
      message: getHealthErrorMessage(error)
    };
  }
}

export async function GET() {
  const [database, redis] = await Promise.all([
    measure(async () => {
      await prisma.$queryRaw`SELECT 1`;
    }),
    measure(async () => {
      await getRedisClient().ping();
    })
  ]);

  const healthy = database.status === "ok" && redis.status === "ok";

  return apiSuccess(
    {
      status: healthy ? "ok" : "degraded",
      checkedAt: new Date().toISOString(),
      components: {
        database,
        redis
      }
    },
    healthy ? 200 : 503
  );
}
