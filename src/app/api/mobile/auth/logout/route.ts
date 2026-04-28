import { deleteSessionByToken } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";

export const runtime = "nodejs";

function extractBearerToken(request: Request) {
  const authorization = request.headers.get("authorization");
  const match = authorization?.match(/^Bearer\s+(.+)$/i);
  return match?.[1] ?? null;
}

export async function POST(request: Request) {
  const token = extractBearerToken(request);

  if (!token) {
    return apiError("缺少会话令牌。", 401, "UNAUTHORIZED");
  }

  await deleteSessionByToken(token);
  return apiSuccess({ loggedOut: true });
}
