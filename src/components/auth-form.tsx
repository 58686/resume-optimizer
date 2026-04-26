"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { readApiResponse } from "@/lib/api-client";

type AuthFormProps = {
  mode: "login" | "signup";
};

type AuthResponse = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  verificationEmailSent?: boolean;
  emailPreviewPath?: string | null;
};

function getPasswordStrength(password: string) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password)) score += 1;

  if (score >= 4) return { label: "强", percent: 100, barClass: "bg-emerald-500", textClass: "text-emerald-600" };
  if (score >= 3) return { label: "中上", percent: 75, barClass: "bg-amber-400", textClass: "text-amber-600" };
  if (score >= 2) return { label: "中", percent: 50, barClass: "bg-amber-500", textClass: "text-amber-600" };
  return { label: "弱", percent: 25, barClass: "bg-red-400", textClass: "text-red-600" };
}

export function AuthForm({ mode }: AuthFormProps) {
  const router = useRouter();
  const toast = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignup = mode === "signup";
  const emailValid = !email || /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const passwordStrength = useMemo(() => getPasswordStrength(password), [password]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isSubmitting) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(isSignup ? "/api/auth/register" : "/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password })
      });

      const payload = await readApiResponse<AuthResponse>(response);

      if (!payload.emailVerified) {
        toast({
          title: isSignup ? "账号已创建，请验证邮箱" : "请先验证邮箱",
          description: isSignup
            ? payload.emailPreviewPath
              ? `开发环境邮件已写入：${payload.emailPreviewPath}`
              : payload.verificationEmailSent
                ? "验证邮件已发送，请查收。"
                : "验证邮件暂未发送，请在下一页重新发送。"
            : "登录成功，请先完成邮箱验证。"
        });
        router.push("/verify-email");
        router.refresh();
        return;
      }

      router.push("/upload");
      router.refresh();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <form className="space-y-5" onSubmit={handleSubmit}>
      {isSignup ? (
        <div>
          <label className="block text-sm font-semibold text-zinc-300">姓名</label>
          <input
            className="input-glow mt-2 block w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-400"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="例如：张三"
          />
        </div>
      ) : null}

      <div>
        <label className="block text-sm font-semibold text-zinc-300">邮箱</label>
        <input
          type="email"
          className="input-glow mt-2 block w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-400"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
        />
        {!emailValid ? <p className="mt-2 text-sm text-red-600">请输入有效的邮箱地址。</p> : null}
      </div>

      <div>
        <div className="flex items-center justify-between gap-3">
          <label className="block text-sm font-semibold text-zinc-300">密码</label>
          {password ? <span className={`text-xs font-semibold ${passwordStrength.textClass}`}>强度：{passwordStrength.label}</span> : null}
        </div>
        <input
          type="password"
          className="input-glow mt-2 block w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-400"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="至少 8 位"
        />
        {/* Password strength bar */}
        {password ? (
          <div className="mt-3">
            <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${passwordStrength.barClass}`}
                style={{ width: `${passwordStrength.percent}%` }}
              />
            </div>
          </div>
        ) : null}
        {!isSignup ? (
          <div className="mt-2 text-right">
            <Link href="/forgot-password" className="text-xs font-medium text-zinc-400 underline-offset-4 hover:text-zinc-300 hover:underline">
              忘记密码？
            </Link>
          </div>
        ) : null}
      </div>

      {error ? (
        <div className="animate-scale-in rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting || !emailValid}
        className="btn-primary w-full rounded-full px-6 py-3.5 text-sm font-semibold text-white"
      >
        {isSubmitting ? (
          <span className="flex items-center justify-center gap-2">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-800 border-t-transparent" />
            提交中...
          </span>
        ) : isSignup ? "创建账号" : "登录"}
      </button>
    </form>
  );
}
