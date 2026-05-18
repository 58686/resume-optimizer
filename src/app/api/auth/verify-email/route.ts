import { z } from "zod";
import { verifyEmailToken } from "@/lib/account-security";
import { createSession, setSessionCookie } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";

const verifyEmailSchema = z.object({
  token: z.string().trim().min(1, "缺少验证令牌。")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  try {
    const body = verifyEmailSchema.parse(await request.json());
    const user = await verifyEmailToken(body.token);
    const { token, expiresAt } = await createSession(user.id);
    const response = apiSuccess({
      verified: true,
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: true,
      sessionToken: token,
      sessionExpiresAt: expiresAt.toISOString()
    });

    setSessionCookie(response, token, expiresAt, request);
    return response;
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "验证请求不合法。");
    }

    return apiError(error instanceof Error ? error.message : "邮箱验证失败。", 400, "EMAIL_VERIFY_FAILED");
  }
}
