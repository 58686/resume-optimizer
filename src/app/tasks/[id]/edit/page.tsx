import Link from "next/link";
import { notFound } from "next/navigation";
import { TaskEditForm } from "@/components/task-edit-form";
import type { AIProviderId } from "@/lib/ai/types";
import { requireCurrentUser } from "@/lib/auth";
import { decryptProviderConfigSnapshot } from "@/lib/provider-config-crypto";
import { prisma } from "@/lib/prisma";
import { getDefaultProviderValues } from "@/lib/provider-settings";

export default async function TaskEditPage({
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
      fileName: true,
      resumeText: true,
      jobDescription: true,
      provider: true,
      model: true,
      providerConfigEncrypted: true
    }
  });

  if (!task) {
    notFound();
  }

  if (task.status === "queued" || task.status === "processing") {
    return (
      <main className="min-h-screen px-6 py-12 text-white">
        <section className="mx-auto max-w-3xl rounded-[2rem] border border-amber-200 bg-amber-50 p-8">
          <p className="text-sm uppercase tracking-[0.28em] text-amber-700">Task Edit</p>
          <h1 className="mt-2 text-3xl font-semibold text-amber-900">运行中的任务暂不支持编辑</h1>
          <p className="mt-3 text-sm leading-6 text-amber-800">
            当前任务还在排队或执行中。请等待任务完成后再编辑，或者直接删除任务重新创建。
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link
              href={`/tasks/${task.id}`}
              className="rounded-full bg-amber-900 px-5 py-3 text-sm font-medium text-white transition hover:bg-amber-800"
            >
              返回任务详情
            </Link>
            <Link
              href="/tasks"
              className="rounded-full border border-amber-300 px-5 py-3 text-sm font-medium text-amber-900 transition hover:border-amber-400"
            >
              返回任务列表
            </Link>
          </div>
        </section>
      </main>
    );
  }

  const provider = task.provider as AIProviderId;
  const defaults = getDefaultProviderValues(provider);
  const snapshot = decryptProviderConfigSnapshot(task.providerConfigEncrypted);

  return (
    <main className="min-h-screen px-6 py-12 text-white">
      <section className="mx-auto max-w-6xl">
        <TaskEditForm
          initialTask={{
            id: task.id,
            fileName: task.fileName,
            status: task.status as "queued" | "processing" | "succeeded" | "failed",
            resumeText: task.resumeText,
            jobDescription: task.jobDescription,
            provider,
            providerValues: {
              protocol: snapshot?.protocol ?? defaults.protocol,
              apiKeyMode: snapshot?.apiKeyMode ?? defaults.apiKeyMode,
              apiKey: "",
              model: task.model,
              baseURL: snapshot?.baseURL ?? defaults.baseURL,
              siteUrl: snapshot?.siteUrl ?? defaults.siteUrl,
              appName: snapshot?.appName ?? defaults.appName,
              proxy: snapshot?.proxy ?? defaults.proxy
            }
          }}
        />
      </section>
    </main>
  );
}
