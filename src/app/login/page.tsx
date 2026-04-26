import Link from "next/link";
import { redirect } from "next/navigation";
import { AuthForm } from "@/components/auth-form";
import { getCurrentUser } from "@/lib/auth";

export default async function LoginPage() {
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
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Login</p>
          <h1 className="mt-3 text-4xl font-extrabold text-white">登录账号</h1>
          <p className="mt-4 text-sm leading-7 text-stone-300">
            登录后可以查看历史分析、追踪任务进度，并安全管理你的 Provider 配置。
          </p>
          <ul className="mt-8 space-y-3 text-sm text-stone-300">
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full glass-panel text-[11px]">✓</span>
              支持异步任务、失败重试和结果回溯。
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full glass-panel text-[11px]">✓</span>
              支持服务端加密保存 Provider 凭据。
            </li>
            <li className="flex items-start gap-3">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full glass-panel text-[11px]">✓</span>
              支持导出 Markdown、复制邮件摘要和打印 PDF。
            </li>
          </ul>
        </div>

        {/* Form panel */}
        <div className="animate-slide-up delay-1 rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[var(--shadow-lg)] backdrop-blur-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Sign In</p>
          <h2 className="mt-2 text-3xl font-bold text-white">欢迎回来</h2>
          <div className="mt-8">
            <AuthForm mode="login" />
          </div>
          <p className="mt-6 text-sm text-zinc-400">
            还没有账号？
            <Link href="/signup" className="ml-2 font-semibold text-white underline-offset-4 hover:underline">
              去注册
            </Link>
          </p>
        </div>
      </section>
    </main>
  );
}
