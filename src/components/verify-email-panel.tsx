"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { readApiResponse } from "@/lib/api-client";
import { ensureBrowserSessionCookie } from "@/lib/browser-session";

type VerifyEmailPanelProps = {
  token: string | null;
  userEmail: string | null;
  isLoggedIn: boolean;
  isVerified: boolean;
};

type VerifyEmailResponse = {
  verified: true;
  id: string;
  name: string;
  email: string;
  emailVerified: true;
  sessionToken?: string;
  sessionExpiresAt?: string;
};

type ResendVerificationResponse = {
  sent: boolean;
  alreadyVerified: boolean;
  previewPath: string | null;
};

export function VerifyEmailPanel({
  token,
  userEmail,
  isLoggedIn,
  isVerified
}: VerifyEmailPanelProps) {
  const router = useRouter();
  const toast = useToast();
  const hasVerifiedToken = useRef(false);
  const [status, setStatus] = useState<"idle" | "verifying" | "verified" | "error">(
    token ? "verifying" : isVerified ? "verified" : "idle"
  );
  const [message, setMessage] = useState("");
  const [previewPath, setPreviewPath] = useState<string | null>(null);
  const [isSending, setIsSending] = useState(false);

  useEffect(() => {
    if (!token || hasVerifiedToken.current) {
      return;
    }

    hasVerifiedToken.current = true;

    async function verify() {
      try {
        setStatus("verifying");
        const response = await fetch("/api/auth/verify-email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token })
        });

        const payload = await readApiResponse<VerifyEmailResponse>(response);
        await ensureBrowserSessionCookie(payload);
        setStatus("verified");
        setMessage("邮箱已验证。");
        toast({
          title: "邮箱验证成功",
          description: "你现在可以继续使用分析功能。"
        });
        router.refresh();
      } catch (error) {
        setStatus("error");
        setMessage(error instanceof Error ? error.message : "邮箱验证失败。");
      }
    }

    void verify();
  }, [router, toast, token]);

  async function handleResend() {
    if (isSending) {
      return;
    }

    try {
      setIsSending(true);
      setMessage("");
      const response = await fetch("/api/auth/verify-email/send", {
        method: "POST"
      });
      const payload = await readApiResponse<ResendVerificationResponse>(response);
      setPreviewPath(payload.previewPath);

      if (payload.alreadyVerified) {
        setStatus("verified");
        setMessage("当前邮箱已完成验证。");
        router.refresh();
        return;
      }

      toast({
        title: "验证邮件已发送",
        description: payload.previewPath ? `开发环境邮件已写入：${payload.previewPath}` : "请查收邮箱。"
      });
      setMessage("新的验证邮件已发送，请查收。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "发送验证邮件失败。");
    } finally {
      setIsSending(false);
    }
  }

  const description = useMemo(() => {
    if (status === "verified") {
      return "邮箱已验证，账号状态正常。";
    }

    if (token && status === "verifying") {
      return "正在验证邮箱，请稍候。";
    }

    if (isLoggedIn) {
      return `当前账号 ${userEmail ?? ""} 尚未完成邮箱验证。`;
    }

    return "请先登录，或重新打开邮箱里的验证链接。";
  }, [isLoggedIn, status, token, userEmail]);

  return (
    <div className="rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[0_30px_80px_rgba(120,94,46,0.1)]">
      <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Email Verification</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">验证邮箱</h1>
      <p className="mt-4 text-sm leading-7 text-zinc-400">{description}</p>

      {message ? (
        <div
          className={`mt-6 rounded-2xl px-4 py-3 text-sm ${
            status === "error"
              ? "border border-red-200 bg-red-50 text-red-700"
              : "border border-emerald-200 bg-emerald-50 text-emerald-700"
          }`}
        >
          {message}
        </div>
      ) : null}

      {previewPath ? (
        <div className="mt-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300">
          开发环境邮件预览：<code className="break-all">{previewPath}</code>
        </div>
      ) : null}

      <div className="mt-8 flex flex-wrap gap-3">
        {status === "verified" ? (
          <>
            <Link
              href="/upload"
              className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent"
            >
              前往分析
            </Link>
            <Link
              href="/"
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:border-zinc-600"
            >
              返回首页
            </Link>
          </>
        ) : isLoggedIn ? (
          <>
            <button
              type="button"
              onClick={handleResend}
              disabled={isSending || status === "verifying"}
              className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent disabled:cursor-not-allowed disabled:bg-stone-400"
            >
              {isSending ? "发送中..." : "重新发送验证邮件"}
            </button>
            <Link
              href="/upload"
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:border-zinc-600"
            >
              稍后再说
            </Link>
          </>
        ) : (
          <>
            <Link
              href="/login"
              className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent"
            >
              去登录
            </Link>
            <Link
              href="/signup"
              className="rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:border-zinc-600"
            >
              创建账号
            </Link>
          </>
        )}
      </div>
    </div>
  );
}
