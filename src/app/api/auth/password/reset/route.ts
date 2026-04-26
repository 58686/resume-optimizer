import { z } from "zod";
import { hashNewPassword, resetPasswordByToken } from "@/lib/account-security";
import { createSession, setSessionCookie } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { applyRateLimitHeaders, checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const resetPasswordSchema = z.object({
  token: z.string().trim().min(1, "缺少重置令牌。"),
  password: z.string().min(8, "密码至少需要 8 位。").max(100, "密码过长。")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const rateLimit = await checkRateLimit({
    key: `reset-password:${getRequestIp(request)}`,
    limit: 10,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("重置密码请求过于频繁，请稍后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  try {
    const body = resetPasswordSchema.parse(await request.json());
    const passwordHash = await hashNewPassword(body.password);
    const user = await resetPasswordByToken(body.token, passwordHash);
    const { token, expiresAt } = await createSession(user.id);
    const response = apiSuccess({
      reset: true,
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt)
    });

    setSessionCookie(response, token, expiresAt);
    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return applyRateLimitHeaders(apiValidationError(error, "重置参数不合法。"), rateLimit);
    }

    return applyRateLimitHeaders(
      apiError(error instanceof Error ? error.message : "重置密码失败。", 400, "PASSWORD_RESET_FAILED"),
      rateLimit
    );
  }
}
