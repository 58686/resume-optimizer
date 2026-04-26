import Link from "next/link";
import { ScoreRing } from "@/components/score-ring";
import { getCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTaskStatusMeta } from "@/lib/task-status";

export default async function HomePage() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <main className="min-h-screen px-6 py-20 text-white">
        {/* Decorative background blobs */}
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
          <div className="absolute -left-32 -top-32 h-[500px] w-[500px] rounded-full bg-brand-gradient-start/20 blur-[100px]" />
          <div className="absolute -right-20 top-20 h-[400px] w-[400px] rounded-full bg-brand-gradient-mid/20 blur-[100px]" />
          <div className="absolute bottom-0 left-1/3 h-[300px] w-[600px] rounded-full bg-brand-gradient-end/20 blur-[100px]" />
        </div>

        <section className="animate-slide-up mx-auto max-w-6xl rounded-[2rem] glass-panel p-10 shadow-glow-lg relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          <p className="mb-4 text-sm font-semibold uppercase tracking-[0.35em] text-zinc-400 relative z-10">AI Resume Optimizer</p>
          <h1 className="max-w-3xl text-5xl font-extrabold leading-[1.15] text-white relative z-10">
            对照目标岗位，<br />
            <span className="text-brand-gradient">快速优化你的简历和面试准备</span>
          </h1>
          <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-400 relative z-10">
            上传简历、粘贴职位描述，快速获得关键词匹配、改写建议、项目优化和面试问答。
          </p>
          <div className="mt-10 flex flex-wrap gap-4 animate-fade-in delay-3 relative z-10">
            <Link
              href="/signup"
              className="btn-primary rounded-full px-7 py-3.5 text-sm font-semibold text-white shadow-glow-md"
            >
              立即注册 →
            </Link>
            <Link
              href="/login"
              className="btn-secondary rounded-full px-6 py-3.5 text-sm font-semibold text-zinc-300"
            >
              已有账号，去登录
            </Link>
          </div>

          {/* Feature badges */}
          <div className="mt-12 flex flex-wrap gap-3 animate-fade-in delay-5 relative z-10">
            {["AI 关键词匹配", "项目改写建议", "面试问答生成", "一键导出报告"].map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-800 bg-zinc-900/80 px-4 py-2 text-xs font-medium text-zinc-300 shadow-sm"
              >
                {tag}
              </span>
            ))}
          </div>
        </section>
      </main>
    );
  }

  const [analysisCount, activeTaskCount, failedTaskCount, averageScore, recentResults, recentTasks] = await Promise.all([
    prisma.resumeAnalysis.count({ where: { userId: user.id } }),
    prisma.analysisTask.count({ where: { userId: user.id, status: { in: ["queued", "processing"] } } }),
    prisma.analysisTask.count({ where: { userId: user.id, status: "failed" } }),
    prisma.resumeAnalysis.aggregate({ where: { userId: user.id }, _avg: { score: true } }),
    prisma.resumeAnalysis.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: { id: true, fileName: true, score: true, createdAt: true }
    }),
    prisma.analysisTask.findMany({
      where: { userId: user.id },
      orderBy: [{ createdAt: "desc" }],
      take: 5,
      select: { id: true, fileName: true, status: true, resultId: true, createdAt: true }
    })
  ]);

  const averageScoreValue = typeof averageScore._avg.score === "number" ? Math.round(averageScore._avg.score) : null;

  const statCards = [
    { label: "累计分析结果", value: analysisCount, icon: "📊" },
    { label: "进行中任务", value: activeTaskCount, icon: "⚡" },
    { label: "失败任务", value: failedTaskCount, icon: "⚠️" },
    { label: "平均匹配分", value: averageScoreValue ?? "--", icon: "🎯" }
  ];

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <section className="mx-auto max-w-6xl space-y-8">
        {/* Hero banner */}
        <div className="animate-slide-up rounded-[2rem] glass-panel p-8 shadow-glow-lg relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-[2px] bg-gradient-to-r from-brand-gradient-start via-brand-gradient-mid to-brand-gradient-end opacity-50" />
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-zinc-400">Dashboard</p>
          <h1 className="mt-2 text-4xl font-extrabold text-white">
            欢迎回来，<span className="text-brand-gradient">{user.name}</span>
          </h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400">
            这里汇总了最近结果、进行中的任务和失败重试入口，适合作为日常使用的主工作台。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href="/upload"
              className="btn-primary rounded-full px-6 py-3 text-sm font-semibold text-white shadow-glow-sm"
            >
              新建分析 →
            </Link>
            <Link
              href="/tasks"
              className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold text-zinc-300"
            >
              查看任务
            </Link>
            <Link
              href="/history"
              className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold text-zinc-300"
            >
              查看历史结果
            </Link>
          </div>
        </div>

        {/* Stat cards */}
        <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, i) => (
            <article
              key={card.label}
              className={`card-hover animate-slide-up delay-${i + 1} rounded-3xl glass-panel p-6`}
            >
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-zinc-400">{card.label}</p>
                <span className="text-xl">{card.icon}</span>
              </div>
              <p className="mt-3 text-3xl font-bold text-brand-gradient drop-shadow-[0_0_10px_rgba(99,102,241,0.5)]">{card.value}</p>
            </article>
          ))}
        </section>

        {/* Recent content */}
        <section className="grid gap-6 lg:grid-cols-2">
          {/* Recent Tasks */}
          <div className="animate-slide-up delay-3 rounded-[2rem] glass-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Recent Tasks</p>
                <h2 className="mt-2 text-xl font-bold text-white">最近任务</h2>
              </div>
              <Link href="/tasks" className="btn-secondary rounded-full px-4 py-1.5 text-xs font-semibold text-zinc-300">
                查看全部
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {recentTasks.length > 0 ? (
                recentTasks.map((task) => {
                  const meta = getTaskStatusMeta(task.status as "queued" | "processing" | "succeeded" | "failed");

                  return (
                    <article key={task.id} className="accent-stripe card-hover rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <p className="font-semibold text-zinc-200">{task.fileName || "未命名文件"}</p>
                          <p className="mt-1 text-xs text-zinc-500">
                            {new Date(task.createdAt).toLocaleString("zh-CN")}
                          </p>
                        </div>
                        <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${meta.badgeClass} bg-zinc-950/50 border-zinc-800`}>
                          {meta.label}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <Link
                          href={`/tasks/${task.id}`}
                          className="btn-secondary rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-300"
                        >
                          查看任务
                        </Link>
                        {task.resultId ? (
                          <Link
                            href={`/result/${task.resultId}`}
                            className="btn-secondary rounded-full px-3.5 py-1.5 text-xs font-semibold text-zinc-300"
                          >
                            查看结果
                          </Link>
                        ) : null}
                      </div>
                    </article>
                  );
                })
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
                  还没有任务，先去创建一次分析。
                </div>
              )}
            </div>
          </div>

          {/* Recent Results */}
          <div className="animate-slide-up delay-4 rounded-[2rem] glass-panel p-6">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Recent Results</p>
                <h2 className="mt-2 text-xl font-bold text-white">最近结果</h2>
              </div>
              <Link href="/history" className="btn-secondary rounded-full px-4 py-1.5 text-xs font-semibold text-zinc-300">
                查看全部
              </Link>
            </div>
            <div className="mt-6 space-y-3">
              {recentResults.length > 0 ? (
                recentResults.map((result) => (
                  <Link
                    key={result.id}
                    href={`/result/${result.id}`}
                    className="card-hover flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/50 p-4"
                  >
                    <div className="score-glow"><ScoreRing score={result.score} size={72} strokeWidth={7} label="得分" /></div>
                    <div className="min-w-0">
                      <p className="font-semibold text-zinc-200">{result.fileName || "未命名文件"}</p>
                      <p className="mt-1 text-xs text-zinc-500">
                        {new Date(result.createdAt).toLocaleString("zh-CN")}
                      </p>
                    </div>
                  </Link>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 p-6 text-center text-sm text-zinc-500">
                  还没有分析结果，完成一次分析后这里会自动展示。
                </div>
              )}
            </div>
          </div>
        </section>
      </section>
    </main>
  );
}
