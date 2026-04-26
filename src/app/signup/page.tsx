import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function SignupPage() {
  const user = await getCurrentUser();

  if (user) {
    redirect(user.emailVerifiedAt ? "/upload" : "/verify-email");
  }

  return (
    <main className="min-h-screen px-6 py-16 text-white">
      <section className="mx-auto grid max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        {/* Info panel — gradient background */}
        <div className="animate-slide-up relative overflow-hidden rounded-[2rem] border border-zinc-800/20 bg-gradient-to-br from-stone-900 via-stone-800 to-stone-900 p-10 text-white shadow-[var(--shadow-xl)]">
          <div className="pointer-events-none absolute -right-16 -top-16 h-64 w-64 rounded-full bg-gradient-to-br from-amber-500/20 to-transparent blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-12 h-48 w-48 rounded-full bg-gradient-to-tr from-amber-400/15 to-transparent blur-2xl" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Signup</p>
          <h1 className="mt-3 text-4xl font-extrabold text-white">创建账号</h1>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            注册后，你的分析结果、任务记录和 Provider 配置都会自动绑定到个人账号。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-stone-300">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full glass-panel text-[11px]">✓</span>
              支持同一份简历多次迭代并保留历史。
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full glass-panel text-[11px]">✓</span>
              支持账号级 Provider Profile 管理。
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full glass-panel text-[11px]">✓</span>
              支持任务失败后直接重试，无需重复上传。
            </li>
          </ul>
        </div>

        {/* Form panel */}
        <div className="animate-slide-up delay-1 rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[var(--shadow-lg)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Create Account</p>
          <h2 className="mt-2 text-3xl font-bold text-white">开始使用</h2>
          <div className="mt-8">
            <AuthForm mode="signup" />
          </div>
          <p className="mt-6 text-sm text-zinc-400">
            已有账号？
            <Link href="/login" className="ml-2 font-semibold text-white underline-offset-4 hover:underline">
              去登录
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
