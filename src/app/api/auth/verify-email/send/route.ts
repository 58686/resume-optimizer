import { sendEmailVerificationEmail } from "@/lib/account-security";
import { getCurrentUser } from "@/lib/auth";
import { apiError, apiSuccess } from "@/lib/api-response";
import { requireCsrfProtection } from "@/lib/csrf";
import { applyRateLimitHeaders, checkRateLimit } from "@/lib/rate-limit";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const csrfError = requireCsrfProtection(request);

  if (csrfError) {
    return csrfError;
  }

  const user = await getCurrentUser();

  if (!user) {
    return apiError("请先登录。", 401, "UNAUTHORIZED");
  }

  if (user.emailVerifiedAt) {
    return apiSuccess({
      sent: false,
      alreadyVerified: true,
      previewPath: null
    });
  }

  const rateLimit = await checkRateLimit({
    key: `verify-email:${user.id}`,
    limit: 3,
    windowMs: 60 * 60 * 1000
  });

  if (!rateLimit.allowed) {
    return applyRateLimitHeaders(
      apiError("验证邮件发送过于频繁，请稍后再试。", { status: 429 }, "RATE_LIMITED"),
      rateLimit
    );
  }

  try {
    const delivery = await sendEmailVerificationEmail(
      {
        id: user.id,
        email: user.email,
        name: user.name,
        emailVerifiedAt: user.emailVerifiedAt
      },
      request
    );

    return applyRateLimitHeaders(
      apiSuccess({
        sent: true,
        alreadyVerified: false,
        previewPath: delivery.previewPath
      }),
      rateLimit
    );
  } catch (error) {
    return applyRateLimitHeaders(
      apiError(error instanceof Error ? error.message : "发送验证邮件失败。", 500, "VERIFY_EMAIL_SEND_FAILED"),
      rateLimit
    );
  }
}
