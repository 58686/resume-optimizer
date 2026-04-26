"use client";

import Link from "next/link";
import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { readApiResponse } from "@/lib/api-client";

export function ForgotPasswordForm() {
  const toast = useToast();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");

    if (isSubmitting) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/auth/password/forgot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email })
      });

      await readApiResponse<{ accepted: true }>(response);
      setIsSubmitted(true);
      toast({
        title: "请求已提交",
        description: "如果该邮箱存在，我们已经发送了重置链接。"
      });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "提交失败。");
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isSubmitted) {
    return (
      <div className="rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[0_30px_80px_rgba(120,94,46,0.1)]">
        <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Password Reset</p>
        <h1 className="mt-3 text-3xl font-semibold text-white">检查邮箱</h1>
        <p className="mt-4 text-sm leading-7 text-zinc-400">
          如果该邮箱存在，我们已经发送了重置链接。开发环境下可到 `storage/email-outbox` 查看邮件内容。
        </p>
        <div className="mt-8 flex gap-3">
          <Link
            href="/login"
            className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent"
          >
            返回登录
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form
      className="rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[0_30px_80px_rgba(120,94,46,0.1)]"
      onSubmit={handleSubmit}
    >
      <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Password Reset</p>
      <h1 className="mt-3 text-3xl font-semibold text-white">忘记密码</h1>
      <p className="mt-4 text-sm leading-7 text-zinc-400">输入注册邮箱，我们会发送一封包含重置链接的邮件。</p>

      <div className="mt-8">
        <label className="block text-sm font-medium text-zinc-300">邮箱</label>
        <input
          type="email"
          className="mt-2 block w-full rounded-2xl border border-zinc-700 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="name@example.com"
        />
      </div>

      {error ? <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <button
          type="submit"
          disabled={isSubmitting || !email}
          className="rounded-full btn-primary px-5 py-3 text-sm font-medium text-white transition hover:border-transparent disabled:cursor-not-allowed disabled:bg-stone-400"
        >
          {isSubmitting ? "发送中..." : "发送重置邮件"}
        </button>
        <Link
          href="/login"
          className="rounded-full border border-zinc-700 px-5 py-3 text-sm text-zinc-300 transition hover:border-zinc-600"
        >
          返回登录
        </Link>
      </div>
    </form>
  );
}
