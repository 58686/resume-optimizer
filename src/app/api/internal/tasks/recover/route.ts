import { recoverTimedOutAnalysisTasks } from "@/lib/analysis-task";
import { apiError, apiSuccess } from "@/lib/api-response";
import { env, normalizeOptional } from "@/lib/env";

export const runtime = "nodejs";

function isAuthorized(request: Request) {
  const secret = normalizeOptional(env.TASK_GUARD_SECRET);

  if (!secret) {
    return process.env.NODE_ENV !== "production";
  }

  const bearerToken = request.headers.get("authorization");
  const headerToken = request.headers.get("x-task-guard-secret");

  return bearerToken === `Bearer ${secret}` || headerToken === secret;
}

async function handleRecover(request: Request) {
  if (!isAuthorized(request)) {
    return apiError("未授权的任务恢复请求。", 401, "UNAUTHORIZED_TASK_GUARD");
  }

  const summary = await recoverTimedOutAnalysisTasks();
  return apiSuccess(summary);
}

export async function GET(request: Request) {
  return handleRecover(request);
}

export async function POST(request: Request) {
  return handleRecover(request);
}
