import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentUser } from "@/lib/auth";

export async function UserNav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 glass-panel border-b border-zinc-800 px-6 py-3.5">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4">
        <Link href="/" className="group flex items-center gap-2.5">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-600 to-purple-800 text-sm shadow-[var(--shadow-glow)]">
            <span className="text-base leading-none text-white">✦</span>
          </span>
          <span className="text-base font-bold tracking-tight text-white transition group-hover:text-indigo-200">
            Resume<span className="text-brand-gradient">Optimizer</span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5">
          <ThemeSwitcher />
          <div className="h-5 w-px bg-zinc-800 mx-1" />
          {user ? (
            <>
              <Link
                href="/providers"
                className="relative rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white"
              >
                AI 配置
              </Link>
              <Link
                href="/history"
                className="relative rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white"
              >
                历史结果
              </Link>
              <Link
                href="/tasks"
                className="relative rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white"
              >
                任务列表
              </Link>
              <Link
                href="/interview-prep"
                className="relative rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white"
              >
                面试准备
              </Link>
              <Link
                href="/upload"
                className="relative rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white"
              >
                新建分析
              </Link>
              {!user.emailVerifiedAt ? (
                <Link
                  href="/verify-email"
                  className="ml-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-400 transition hover:bg-amber-500/20"
                >
                  验证邮箱
                </Link>
              ) : null}
              <div className="ml-2 flex items-center gap-2 border-l border-zinc-800 pl-3">
                <span className="hidden text-sm font-medium text-zinc-400 md:inline">{user.name}</span>
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-xl px-3.5 py-2 text-sm font-medium text-zinc-400 transition hover:bg-zinc-800/50 hover:text-white"
              >
                登录
              </Link>
              <Link
                href="/signup"
                className="btn-primary ml-1 rounded-full px-5 py-2 text-sm font-semibold text-white"
              >
                注册
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
