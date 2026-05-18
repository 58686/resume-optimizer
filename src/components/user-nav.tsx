import Link from "next/link";
import { LogoutButton } from "@/components/logout-button";
import { ThemeSwitcher } from "@/components/theme-switcher";
import { getCurrentUser } from "@/lib/auth";

const authedNavItems = [
  { href: "/upload", label: "新建分析" },
  { href: "/tasks", label: "任务" },
  { href: "/history", label: "历史" },
  { href: "/interview-prep", label: "面试准备" },
  { href: "/providers", label: "AI 配置" }
];

export async function UserNav() {
  const user = await getCurrentUser();

  return (
    <header className="sticky top-0 z-40 px-3 py-3 sm:px-5">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 rounded-2xl border border-[rgba(118,82,58,0.16)] bg-[rgba(255,248,237,0.78)] px-4 py-3 shadow-[0_16px_45px_rgba(118,82,58,0.14)] backdrop-blur-xl sm:px-5 lg:flex-row lg:items-center lg:justify-between">
        <Link href="/" className="group flex items-center gap-3">
          <span className="flex h-9 w-9 items-center justify-center rounded-2xl border border-white/50 bg-[linear-gradient(135deg,#f7d6af,#df9b75,#9db889)] shadow-[0_8px_22px_rgba(217,141,104,0.22)]">
            <span className="h-3 w-3 rounded-full bg-white/90 shadow-[0_0_0_5px_rgba(255,255,255,0.18)]" />
          </span>
          <div>
            <span className="block text-base font-bold tracking-tight text-[var(--text-primary)] transition group-hover:text-[var(--brand-accent)]">
              Resume Optimizer
            </span>
            <span className="hidden text-xs font-medium text-[var(--text-muted)] sm:block">温和、清晰地打磨下一版简历</span>
          </div>
        </Link>

        <nav className="flex flex-wrap items-center gap-2">
          {user ? (
            <>
              <ThemeSwitcher />
              <div className="hidden h-5 w-px bg-[rgba(118,82,58,0.16)] lg:block" />
              {authedNavItems.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="rounded-full px-3.5 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[rgba(118,82,58,0.08)] hover:text-[var(--text-primary)]"
                >
                  {item.label}
                </Link>
              ))}
              {!user.emailVerifiedAt ? (
                <Link
                  href="/verify-email"
                  className="rounded-full border border-amber-500/25 bg-amber-200/50 px-3 py-1.5 text-xs font-semibold text-amber-800 transition hover:bg-amber-200/70"
                >
                  验证邮箱
                </Link>
              ) : null}
              <div className="flex items-center gap-2 border-l border-[rgba(118,82,58,0.16)] pl-3">
                <span className="hidden max-w-28 truncate text-sm font-semibold text-[var(--text-secondary)] md:inline">{user.name}</span>
                <LogoutButton />
              </div>
            </>
          ) : (
            <>
              <ThemeSwitcher />
              <Link
                href="/login"
                className="rounded-full px-4 py-2 text-sm font-semibold text-[var(--text-secondary)] transition hover:bg-[rgba(118,82,58,0.08)] hover:text-[var(--text-primary)]"
              >
                登录
              </Link>
              <Link
                href="/signup"
                className="btn-primary rounded-full px-5 py-2 text-sm font-semibold text-white"
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
