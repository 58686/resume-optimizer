import { z } from "zod";
import { createPasswordResetForEmail } from "@/lib/account-security";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { applyRateLimitHeaders, checkRateLimit, getRequestIp } from "@/lib/rate-limit";

const forgotPasswordSchema = z.object({
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址。")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const rateLimit = await checkRateLimit({
    key: `forgot-password:${getRequestIp(request)}`,
    limit: 5,
    windowMs: 15 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("重置密码请求过于频繁，请稍后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  try {
    const body = forgotPasswordSchema.parse(await request.json());

    try {
      await createPasswordResetForEmail(body.email, request);
    } catch (error) {
      console.error("Failed to create password reset email:", error);
    }

    return applyRateLimitHeaders(
      apiSuccess({
        accepted: true
      }),
      rateLimit
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return applyRateLimitHeaders(apiValidationError(error, "请求参数不合法。"), rateLimit);
    }

    return applyRateLimitHeaders(apiError("发送重置邮件失败。", 500, "FORGOT_PASSWORD_FAILED"), rateLimit);
  }
}
