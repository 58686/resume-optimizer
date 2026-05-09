import { z } from "zod";
import { createSession, maybePurgeExpiredSessions, setSessionCookie, verifyPassword } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { prisma } from "@/lib/prisma";
import { applyRateLimitHeaders, checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址。"),
  password: z.string().min(1, "请输入密码。")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const rateLimit = await checkRateLimit({
    key: `login:${getRequestIp(request)}`,
    limit: 10,
    windowMs: 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("登录尝试过于频繁，请稍后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  try {
    maybePurgeExpiredSessions();
    const body = loginSchema.parse(await request.json());
    const user = await prisma.user.findUnique({ where: { email: body.email } });

    if (!user || !(await verifyPassword(body.password, user.passwordHash))) {
      return applyRateLimitHeaders(
        apiError("邮箱或密码错误。", 401, "INVALID_CREDENTIALS"),
        rateLimit
      );
    }

    const { token, expiresAt } = await createSession(user.id);
    const response = apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      sessionToken: token,
      sessionExpiresAt: expiresAt.toISOString()
    });

    setSessionCookie(response, token, expiresAt);
    return applyRateLimitHeaders(response, rateLimit);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return applyRateLimitHeaders(apiValidationError(error, "登录信息不合法。"), rateLimit);
    }

    return applyRateLimitHeaders(apiError("登录失败。", 500, "LOGIN_FAILED"), rateLimit);
  }
}
