import { createHash, randomBytes } from "node:crypto";
import { prisma } from "@/lib/prisma";
import { hashPassword } from "@/lib/auth";
import { resolveAppOrigin } from "@/lib/app-origin";
import { sendTransactionalEmail, type EmailDeliveryResult } from "@/lib/email";
import { env } from "@/lib/env";

type UserIdentity = {
  id: string;
  email: string;
  name: string;
  emailVerifiedAt: Date | null;
};

function hashToken(token: string) {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken() {
  return randomBytes(32).toString("hex");
}

function buildEmailVerificationUrl(token: string, request?: Request) {
  const origin = resolveAppOrigin(request);
  return `${origin}/verify-email?token=${encodeURIComponent(token)}`;
}

function buildPasswordResetUrl(token: string, request?: Request) {
  const origin = resolveAppOrigin(request);
  return `${origin}/reset-password?token=${encodeURIComponent(token)}`;
}

async function createEmailVerificationToken(userId: string) {
  const token = generateToken();

  await prisma.emailVerificationToken.deleteMany({
    where: { userId }
  });

  await prisma.emailVerificationToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS * 60 * 60 * 1000)
    }
  });

  return token;
}

async function createPasswordResetToken(userId: string) {
  const token = generateToken();

  await prisma.passwordResetToken.deleteMany({
    where: { userId }
  });

  await prisma.passwordResetToken.create({
    data: {
      userId,
      tokenHash: hashToken(token),
      expiresAt: new Date(Date.now() + env.PASSWORD_RESET_TOKEN_TTL_MINUTES * 60 * 1000)
    }
  });

  return token;
}

export async function sendEmailVerificationEmail(
  user: UserIdentity,
  request?: Request
): Promise<EmailDeliveryResult> {
  if (user.emailVerifiedAt) {
    throw new Error("当前邮箱已完成验证。");
  }

  const token = await createEmailVerificationToken(user.id);
  const url = buildEmailVerificationUrl(token, request);

  return sendTransactionalEmail({
    to: user.email,
    subject: "验证你的 Resume Optimizer 账号邮箱",
    category: "verify-email",
    text: [
      `你好，${user.name}：`,
      "",
      "请点击下面的链接验证邮箱：",
      url,
      "",
      `链接有效期：${env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} 小时。`
    ].join("\n"),
    html: [
      `<p>你好，${user.name}：</p>`,
      `<p>请点击下面的链接验证邮箱：</p>`,
      `<p><a href="${url}">${url}</a></p>`,
      `<p>链接有效期：${env.EMAIL_VERIFICATION_TOKEN_TTL_HOURS} 小时。</p>`
    ].join("")
  });
}

export async function verifyEmailToken(token: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.emailVerificationToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true
        }
      }
    }
  });

  if (!record) {
    throw new Error("验证链接无效或已失效。");
  }

  if (record.expiresAt <= new Date()) {
    await prisma.emailVerificationToken.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new Error("验证链接已过期，请重新发送。");
  }

  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: record.userId },
      data: {
        emailVerifiedAt: record.user.emailVerifiedAt ?? new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true
      }
    });

    await tx.emailVerificationToken.deleteMany({
      where: { userId: record.userId }
    });

    return updatedUser;
  });

  return user;
}

export async function createPasswordResetForEmail(email: string, request?: Request) {
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      email: true,
      name: true,
      emailVerifiedAt: true
    }
  });

  if (!user) {
    return null;
  }

  const token = await createPasswordResetToken(user.id);
  const url = buildPasswordResetUrl(token, request);

  return sendTransactionalEmail({
    to: user.email,
    subject: "重置你的 Resume Optimizer 密码",
    category: "password-reset",
    text: [
      `你好，${user.name}：`,
      "",
      "请点击下面的链接重置密码：",
      url,
      "",
      `链接有效期：${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} 分钟。`
    ].join("\n"),
    html: [
      `<p>你好，${user.name}：</p>`,
      `<p>请点击下面的链接重置密码：</p>`,
      `<p><a href="${url}">${url}</a></p>`,
      `<p>链接有效期：${env.PASSWORD_RESET_TOKEN_TTL_MINUTES} 分钟。</p>`
    ].join("")
  });
}

export async function resetPasswordByToken(token: string, passwordHash: string) {
  const tokenHash = hashToken(token);
  const record = await prisma.passwordResetToken.findUnique({
    where: { tokenHash },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          name: true,
          emailVerifiedAt: true
        }
      }
    }
  });

  if (!record) {
    throw new Error("重置链接无效或已失效。");
  }

  if (record.expiresAt <= new Date()) {
    await prisma.passwordResetToken.delete({ where: { id: record.id } }).catch(() => undefined);
    throw new Error("重置链接已过期，请重新申请。");
  }

  const user = await prisma.$transaction(async (tx) => {
    const updatedUser = await tx.user.update({
      where: { id: record.userId },
      data: {
        passwordHash,
        emailVerifiedAt: record.user.emailVerifiedAt ?? new Date()
      },
      select: {
        id: true,
        email: true,
        name: true,
        emailVerifiedAt: true
      }
    });

    await tx.passwordResetToken.deleteMany({
      where: { userId: record.userId }
    });

    await tx.session.deleteMany({
      where: { userId: record.userId }
    });

    return updatedUser;
  });

  return user;
}

export async function hashNewPassword(password: string) {
  return hashPassword(password);
}
