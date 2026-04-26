import { TaskList } from "@/components/task-list";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function TasksPage() {
  const user = await requireCurrentUser();
  const items = await prisma.analysisTask.findMany({
    where: { userId: user.id },
    orderBy: [{ createdAt: "desc" }],
    take: 50,
    select: {
      id: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true,
      fileName: true,
      status: true,
      errorMessage: true,
      resultId: true
    }
  });

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <section className="mx-auto max-w-6xl space-y-6">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Tasks</p>
          <h1 className="mt-2 text-4xl font-semibold text-white">分析任务列表</h1>
          <p className="mt-3 text-sm text-zinc-400">
            这里展示当前账号最近 50 个分析任务，支持编辑重跑、失败重试和删除。
          </p>
        </div>

        <TaskList
          items={items.map((item) => ({
            ...item,
            status: item.status as "queued" | "processing" | "succeeded" | "failed",
            createdAt: item.createdAt.toISOString(),
            startedAt: item.startedAt?.toISOString() ?? null,
            finishedAt: item.finishedAt?.toISOString() ?? null
          }))}
        />
      </section>
    </main>
  );
}
