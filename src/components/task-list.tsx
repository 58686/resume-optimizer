import Link from "next/link";
import { DeleteTaskButton } from "@/components/delete-task-button";
import { RetryTaskButton } from "@/components/retry-task-button";
import { formatVisibleErrorMessage } from "@/lib/model-error";
import { getTaskStatusMeta } from "@/lib/task-status";

type TaskListItem = {
  id: string;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
  fileName: string | null;
  status: "queued" | "processing" | "succeeded" | "failed";
  errorMessage: string | null;
  resultId: string | null;
};

type TaskListProps = {
  items: TaskListItem[];
};

export function TaskList({ items }: TaskListProps) {
  if (items.length === 0) {
    return (
      <section className="rounded-[2rem] border border-dashed border-zinc-700 bg-zinc-900/30 p-8 text-center">
        <p className="text-lg font-medium text-zinc-200">还没有分析任务</p>
        <p className="mt-2 text-sm text-zinc-400">上传一份简历并创建分析后，任务会显示在这里。</p>
        <Link
          href="/upload"
          className="mt-5 inline-flex rounded-full btn-primary px-5 py-2.5 text-sm font-medium text-white transition hover:border-transparent"
        >
          去上传
        </Link>
      </section>
    );
  }

  return (
    <div className="space-y-4">
      {items.map((item) => {
        const meta = getTaskStatusMeta(item.status);

        return (
          <article
            key={item.id}
            className="overflow-hidden rounded-[2rem] glass-panel transition hover:border-zinc-700"
          >
            <div className={`h-1 w-full ${meta.accentClass}`} />
            <div className="p-6">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-lg font-semibold text-white">
                      {item.fileName || "未命名文件"}
                    </p>
                    <span className={`rounded-full border px-3 py-1 text-xs font-medium ${meta.badgeClass}`}>
                      {item.status === "processing" ? "分析中" : meta.label}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-400">任务 ID：{item.id}</p>
                  <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-zinc-400">
                    <span>创建：{new Date(item.createdAt).toLocaleString("zh-CN")}</span>
                    <span>
                      开始：
                      {item.startedAt ? new Date(item.startedAt).toLocaleString("zh-CN") : "等待中"}
                    </span>
                    <span>
                      完成：
                      {item.finishedAt ? new Date(item.finishedAt).toLocaleString("zh-CN") : "未完成"}
                    </span>
                  </div>
                  {item.status === "processing" ? (
                    <div className="inline-flex items-center gap-2 rounded-full bg-amber-500/10 px-3 py-1 text-xs text-amber-400">
                      <span className="inline-block h-2 w-2 animate-pulse rounded-full bg-amber-500/100" />
                      系统正在执行分析，请稍候。
                    </div>
                  ) : null}
                  {item.errorMessage ? (
                    <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
                      {formatVisibleErrorMessage(item.errorMessage)}
                    </div>
                  ) : null}
                </div>

                <div className="flex flex-wrap gap-3 lg:justify-end">
                  <Link
                    href={`/tasks/${item.id}`}
                    className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                  >
                    查看任务
                  </Link>
                  {item.status !== "queued" && item.status !== "processing" ? (
                    <Link
                      href={`/tasks/${item.id}/edit`}
                      className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                    >
                      编辑任务
                    </Link>
                  ) : null}
                  {item.resultId ? (
                    <Link
                      href={`/result/${item.resultId}`}
                      className="rounded-full btn-primary px-4 py-2 text-sm font-medium text-white transition hover:border-transparent"
                    >
                      查看结果
                    </Link>
                  ) : null}
                  {item.status === "failed" ? <RetryTaskButton taskId={item.id} /> : null}
                  <DeleteTaskButton taskId={item.id} />
                </div>
              </div>
            </div>
          </article>
        );
      })}
    </div>
  );
}
