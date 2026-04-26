import { notFound } from "next/navigation";
import { TaskStatusPanel } from "@/components/task-status-panel";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { parseStreamedAnalysis } from "@/lib/streamed-analysis";

export default async function TaskDetailPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCurrentUser();
  const { id } = await params;

  const task = await prisma.analysisTask.findFirst({
    where: { id, userId: user.id },
    select: {
      id: true,
      status: true,
      progressStage: true,
      progressMessage: true,
      streamedAnalysis: true,
      resultId: true,
      errorMessage: true,
      createdAt: true,
      startedAt: true,
      finishedAt: true
    }
  });

  if (!task) {
    notFound();
  }

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <section className="mx-auto max-w-5xl">
        <TaskStatusPanel
          initialTask={{
            ...task,
            status: task.status as "queued" | "processing" | "succeeded" | "failed",
            streamedAnalysis: parseStreamedAnalysis(task.streamedAnalysis),
            createdAt: task.createdAt.toISOString(),
            startedAt: task.startedAt?.toISOString() ?? null,
            finishedAt: task.finishedAt?.toISOString() ?? null
          }}
        />
      </section>
    </main>
  );
}
