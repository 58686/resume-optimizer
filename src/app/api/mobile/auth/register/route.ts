import { z } from "zod";
import { sendEmailVerificationEmail } from "@/lib/account-security";
import { createSession, hashPassword } from "@/lib/auth";
import { apiError, apiSuccess, apiValidationError } from "@/lib/api-response";
import { prisma } from "@/lib/prisma";

const registerSchema = z.object({
  name: z.string().trim().min(2, "姓名至少需要 2 个字符。").max(50, "姓名过长。"),
  email: z.string().trim().toLowerCase().email("请输入有效的邮箱地址。"),
  password: z.string().min(8, "密码至少需要 8 位。").max(100, "密码过长。")
});

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = registerSchema.parse(await request.json());
    const existing = await prisma.user.findUnique({ where: { email: body.email } });

    if (existing) {
      return apiError("该邮箱已注册。", 409, "EMAIL_ALREADY_EXISTS");
    }

    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({
      data: {
        name: body.name,
        email: body.email,
        passwordHash
      },
      select: {
        id: true,
        name: true,
        email: true,
        emailVerifiedAt: true
      }
    });

    let verificationEmailSent = false;
    let emailPreviewPath: string | null = null;

    try {
      const delivery = await sendEmailVerificationEmail(user, request);
      verificationEmailSent = true;
      emailPreviewPath = delivery.previewPath;
    } catch (emailError) {
      console.error("Failed to send verification email after mobile register:", emailError);
    }

    const { token, expiresAt } = await createSession(user.id);

    return apiSuccess({
      id: user.id,
      name: user.name,
      email: user.email,
      emailVerified: Boolean(user.emailVerifiedAt),
      sessionToken: token,
      sessionExpiresAt: expiresAt.toISOString(),
      verificationEmailSent,
      emailPreviewPath
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return apiValidationError(error, "注册信息不合法。");
    }

    console.error("Mobile register route failed:", error);
    return apiError("注册失败。", 500, "REGISTER_FAILED");
  }
}
