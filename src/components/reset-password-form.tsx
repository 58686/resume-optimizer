"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { readApiResponse } from "@/lib/api-client";

type ResetPasswordFormProps = {
  token: string | null;
};

type ResetPasswordResponse = {
  reset: true;
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
};

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 4) return { label: "强", className: "text-emerald-600" };
  if (score >= 2) return { label: "中", className: "text-amber-600" };
  return { label: "弱", className: "text-red-600" };
}

export function ResetPasswordForm({ token }: ResetPasswordFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (!token) {
      setError("缺少重置令牌，请重新申请。");
      return;
    }

    if (password !== confirmPassword) {
      setError("两次输入的密码不一致。");
      return;
    }

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/password/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password })
      });

      const payload = await readApiResponse<ResetPasswordResponse>(response);
      toast({
        title: "密码已重置",
        description: "你已自动登录。"
      });
      router.push(payload.emailVerified ? "/upload" : "/verify-email");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "重置密码失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form
      className="rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[0_30px_80px_rgba(120,94,46,0.1)]"
      onSubmit={handleSubmit}
    >
      <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">New Password</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">重置密码</h1>
      <p className="mt-4 text-sm leading-7 text-zinc-400">输入新的登录密码。提交后会自动登录当前账号。</p>

      {!token ? (
        <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          缺少重置令牌，请重新申请重置邮件。
        </div>
      ) : null}

      <div className="mt-8">
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-medium text-zinc-300">新密码</label>
          {password ? <span className={`text-sm ${passwordStrength.className}`}>强度：{passwordStrength.label}</span> : null}
        </div>
        <input
          type="password"
          className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="至少 8 位"
        />
      </div>

      <div className="mt-5">
        <label className="block text-sm font-medium text-zinc-300">确认新密码</label>
        <input
          type="password"
          className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          placeholder="再次输入密码"
        />
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !token}
          className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isSubmitting ? "提交中..." : "重置密码"}
        </button>
        <Link
          href="/forgot-password"
          className="rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:border-zinc-600"
        >
          重新申请链接
        </Link>
      </div>
    </form>
  );
}
