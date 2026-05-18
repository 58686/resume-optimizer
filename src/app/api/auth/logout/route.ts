import { clearSessionCookie, deleteSessionByToken, SESSION_COOKIE_NAME } from "@/lib/auth";
import { apiSuccess } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const token = request.headers
    .get("cookie")
    ?.split(";")
    .map((item) => item.trim())
    .find((item) => item.startsWith(`${SESSION_COOKIE_NAME}=`))
    ?.split("=")[1] ??
    request.headers.get("authorization")?.match(/^Bearer\s+(.+)$/i)?.[1];

  if (token) {
    await deleteSessionByToken(token);
  }

  const response = apiSuccess({ loggedOut: true });
  clearSessionCookie(response, request);
  return response;
}
