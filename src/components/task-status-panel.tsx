"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { DeleteTaskButton } from "@/components/delete-task-button";
import { RetryTaskButton } from "@/components/retry-task-button";
import { readApiResponse } from "@/lib/api-client";
import { formatVisibleErrorMessage } from "@/lib/model-error";
import { getTaskStatusMeta, type AnalysisTaskStatus } from "@/lib/task-status";
import type { PartialAnalysisResult } from "@/types/analysis";

type TaskSnapshot = {
  id: string;
  status: AnalysisTaskStatus;
  progressStage?: string | null;
  progressMessage?: string | null;
  streamedAnalysis: PartialAnalysisResult;
  resultId: string | null;
  errorMessage: string | null;
  createdAt: string;
  startedAt: string | null;
  finishedAt: string | null;
};

type TaskStatusPanelProps = {
  initialTask: TaskSnapshot;
};

const POLL_INTERVAL_MS = 1500;

const PROGRESS_STEPS = [
  { stage: "queued",      label: "排队中" },
  { stage: "processing",  label: "启动分析" },
  { stage: "keywords",    label: "关键词匹配" },
  { stage: "suggestions", label: "生成建议" },
  { stage: "summary",     label: "改写总结" },
  { stage: "projects",    label: "改写项目" },
  { stage: "interview",   label: "面试问答" },
  { stage: "completed",   label: "保存结果" }
] as const;

function getStepIndex(stage: string | null | undefined, status: string) {
  if (status === "succeeded") return PROGRESS_STEPS.length;
  if (!stage) return 0;
  const idx = PROGRESS_STEPS.findIndex((s) => s.stage === stage);
  return idx === -1 ? 1 : idx;
}

function ProgressSteps({ progressStage, status }: { progressStage: string | null | undefined; status: string }) {
  const currentIdx = getStepIndex(progressStage, status);
  const failed = status === "failed";

  return (
    <div className="mt-5">
      <div className="flex items-center gap-0">
        {PROGRESS_STEPS.map((step, idx) => {
          const done = currentIdx > idx;
          const active = currentIdx === idx && !failed;
          const isFailed = failed && currentIdx === idx;
          return (
            <div key={step.stage} className="flex flex-1 flex-col items-center gap-1.5 min-w-0">
              <div className="flex w-full items-center">
                {idx > 0 && (
                  <div className={`h-0.5 flex-1 transition-all duration-500 ${done ? "bg-brand-gradient" : "bg-zinc-800"}`} />
                )}
                <div className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all duration-300 ${
                  isFailed
                    ? "bg-red-500/20 text-red-400 ring-2 ring-red-500/40"
                    : done
                      ? "bg-brand-gradient text-white shadow-[0_0_8px_var(--brand-glow)]"
                      : active
                        ? "bg-zinc-800 text-white ring-2 ring-[var(--brand-accent)] ring-offset-2 ring-offset-[var(--surface-bg)]"
                        : "bg-zinc-900 text-zinc-600"
                }`}>
                  {done ? "✓" : idx + 1}
                </div>
                {idx < PROGRESS_STEPS.length - 1 && (
                  <div className={`h-0.5 flex-1 transition-all duration-500 ${done ? "bg-brand-gradient" : "bg-zinc-800"}`} />
                )}
              </div>
              <span className={`text-center text-[10px] font-medium leading-tight transition-colors ${
                active ? "text-white" : done ? "text-zinc-400" : "text-zinc-700"
              }`}>
                {step.label}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionCard({
  title,
  subtitle,
  children
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-[2rem] border border-zinc-800 glass-panel p-6 backdrop-blur-sm">
      <div>
        <h2 className="text-xl font-bold text-white">{title}</h2>
        {subtitle ? <p className="mt-2 text-sm text-zinc-400">{subtitle}</p> : null}
      </div>
      <div className="mt-5">{children}</div>
    </section>
  );
}

export function TaskStatusPanel({ initialTask }: TaskStatusPanelProps) {
  const router = useRouter();
  const [task, setTask] = useState<TaskSnapshot>(initialTask);
  const [pollError, setPollError] = useState("");
  const [streamMode, setStreamMode] = useState<"idle" | "sse" | "poll">("idle");

  useEffect(() => {
    if (task.status === "succeeded" && task.resultId) {
      const timer = window.setTimeout(() => {
        router.replace(`/result/${task.resultId}`);
        router.refresh();
      }, 1200);

      return () => window.clearTimeout(timer);
    }
  }, [router, task.resultId, task.status]);

  useEffect(() => {
    if (task.status === "succeeded" || task.status === "failed") {
      return;
    }

    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const source = new EventSource(`/api/tasks/${task.id}/events`);
    setStreamMode("sse");

    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as TaskSnapshot;
      setTask(data);
      setPollError("");
    };

    source.onerror = () => {
      setStreamMode("poll");
      source.close();
    };

    return () => source.close();
  }, [task.id, task.status]);

  useEffect(() => {
    if (task.status === "succeeded" || task.status === "failed" || streamMode === "sse") {
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/tasks/${task.id}`, { cache: "no-store" });
        const data = await readApiResponse<TaskSnapshot>(response);
        if (cancelled) return;
        setTask(data);
        setPollError("");
        setStreamMode("poll");
      } catch (error) {
        if (cancelled) return;
        setPollError(
          formatVisibleErrorMessage(
            error instanceof Error ? error.message : "刷新任务状态失败。"
          )
        );
      }
    }, POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [streamMode, task.id, task.status]);

  const statusMeta = useMemo(() => getTaskStatusMeta(task.status), [task.status]);
  const canEdit = task.status !== "queued" && task.status !== "processing";
  const streamed = task.streamedAnalysis;
  const hasLiveContent =
    typeof streamed.score === "number" ||
    (streamed.matchedKeywords?.length ?? 0) > 0 ||
    (streamed.missingKeywords?.length ?? 0) > 0 ||
    (streamed.suggestions?.length ?? 0) > 0 ||
    Boolean(streamed.rewrittenSummary) ||
    (streamed.rewrittenProjects?.length ?? 0) > 0 ||
    (streamed.interviewQuestions?.length ?? 0) > 0;

  return (
    <div className="space-y-6">
      {/* Header */}
      <section className="animate-slide-up rounded-[2rem] border border-zinc-800 glass-panel p-6 shadow-[var(--shadow-md)] backdrop-blur-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Task</p>
            <h1 className="mt-2 text-4xl font-extrabold text-white">分析任务状态</h1>
            <p className="mt-3 text-sm leading-6 text-zinc-400" aria-live="polite">
              {task.progressMessage || statusMeta.description}
            </p>
            <p className="mt-2 text-xs text-zinc-500">
              {streamMode === "sse"
                ? "SSE 实时更新中"
                : streamMode === "poll"
                  ? "实时流中断，已回退轮询"
                  : "等待连接实时流"}
            </p>
          </div>
          <div className={`rounded-full border px-4 py-2 text-sm font-semibold ${statusMeta.badgeClass}`}>
            {statusMeta.label}
          </div>
        </div>
        {(task.status === "processing" || task.status === "queued") && (
          <ProgressSteps progressStage={task.progressStage} status={task.status} />
        )}
      </section>

      {/* Stat cards */}
      <section className="grid gap-4 md:grid-cols-4">
        {[
          { label: "任务 ID", value: task.id, breakAll: true },
          { label: "创建时间", value: new Date(task.createdAt).toLocaleString("zh-CN") },
          { label: "开始时间", value: task.startedAt ? new Date(task.startedAt).toLocaleString("zh-CN") : "等待中" },
          { label: "完成时间", value: task.finishedAt ? new Date(task.finishedAt).toLocaleString("zh-CN") : "未完成" }
        ].map((card, i) => (
          <div key={card.label} className={`card-hover animate-slide-up delay-${i + 1} rounded-3xl border border-zinc-800 glass-panel p-5 backdrop-blur-sm`}>
            <p className="text-xs font-semibold text-zinc-400">{card.label}</p>
            <p className={`mt-3 text-sm font-semibold text-white ${card.breakAll ? "break-all" : ""}`}>{card.value}</p>
          </div>
        ))}
      </section>

      {/* Processing indicator */}
      {task.status === "processing" ? (
        <section className="animate-scale-in rounded-[2rem] border border-amber-200/60 bg-amber-50/70 p-5 text-sm text-amber-800">
          <div className="flex items-center gap-3">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.4)]" />
            <span className="font-medium">{task.progressMessage || "AI 正在分析你的简历与岗位描述，请稍候。"}</span>
          </div>
        </section>
      ) : null}

      {/* AI live output */}
      <SectionCard
        title="AI 实时输出"
        subtitle="这里会随着任务执行持续刷新，不必等到最终结果页。"
      >
        {hasLiveContent ? (
          <div className="space-y-5">
            <div className="grid gap-4 md:grid-cols-3">
              {[
                { label: "当前匹配分", value: typeof streamed.score === "number" ? streamed.score : "--" },
                { label: "命中关键词", value: streamed.matchedKeywords?.length ?? 0 },
                { label: "待补充关键词", value: streamed.missingKeywords?.length ?? 0 }
              ].map((stat) => (
                <div key={stat.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                  <p className="text-xs font-semibold text-zinc-400">{stat.label}</p>
                  <p className="mt-2 text-3xl font-bold text-brand-gradient">{stat.value}</p>
                </div>
              ))}
            </div>

            {(streamed.matchedKeywords?.length ?? 0) > 0 || (streamed.missingKeywords?.length ?? 0) > 0 ? (
              <div className="grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl border border-emerald-200/60 bg-emerald-50/50 p-4">
                  <p className="text-sm font-bold text-emerald-800">已命中关键词</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(streamed.matchedKeywords ?? []).map((item) => (
                      <span key={item} className="rounded-full border border-emerald-200 bg-zinc-900/50 px-3 py-1 text-sm font-medium text-emerald-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="rounded-2xl border border-amber-200/60 bg-amber-50/50 p-4">
                  <p className="text-sm font-bold text-amber-800">待补充关键词</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {(streamed.missingKeywords ?? []).map((item) => (
                      <span key={item} className="rounded-full border border-amber-200 bg-zinc-900/50 px-3 py-1 text-sm font-medium text-amber-700">
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ) : null}

            {(streamed.suggestions?.length ?? 0) > 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="text-sm font-bold text-zinc-200">实时建议</p>
                <ul className="mt-3 space-y-2 text-sm leading-7 text-zinc-300">
                  {(streamed.suggestions ?? []).map((item, index) => (
                    <li key={`${index}-${item}`}>• {item}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {streamed.rewrittenSummary ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="text-sm font-bold text-zinc-200">实时总结改写</p>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                  {streamed.rewrittenSummary}
                </p>
              </div>
            ) : null}

            {(streamed.rewrittenProjects?.length ?? 0) > 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="text-sm font-bold text-zinc-200">实时项目改写</p>
                <div className="mt-3 space-y-3">
                  {(streamed.rewrittenProjects ?? []).map((item, index) => (
                    <article key={`${item.title}-${index}`} className="rounded-2xl glass-panel p-4">
                      <p className="font-semibold text-white">{item.title || `项目 ${index + 1}`}</p>
                      <p className="mt-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">After</p>
                      <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{item.after}</p>
                    </article>
                  ))}
                </div>
              </div>
            ) : null}

            {(streamed.interviewQuestions?.length ?? 0) > 0 ? (
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
                <p className="text-sm font-bold text-zinc-200">实时面试问答</p>
                <div className="mt-3 space-y-3">
                  {(streamed.interviewQuestions ?? []).map((item, index) => (
                    <details key={`${item.question}-${index}`} className="group rounded-2xl glass-panel px-4 py-3">
                      <summary className="cursor-pointer list-none text-sm font-semibold text-white">
                        {item.question}
                      </summary>
                      <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{item.answer}</p>
                    </details>
                  ))}
                </div>
              </div>
            ) : null}
          </div>
        ) : (
          <div className="rounded-2xl border border-dashed border-zinc-700 bg-zinc-900/30 px-5 py-8 text-sm text-zinc-400">
            {task.status === "processing" ? (
              <div className="flex items-center gap-3">
                <div className="animate-shimmer h-4 w-32 rounded-full" />
                <span>AI 还没有返回可展示的部分结果。进入关键词提取后，这里会开始实时刷新。</span>
              </div>
            ) : (
              "AI 还没有返回可展示的部分结果。进入关键词提取后，这里会开始实时刷新。"
            )}
          </div>
        )}
      </SectionCard>

      {/* Errors */}
      {pollError ? (
        <div className="animate-scale-in rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {pollError}
        </div>
      ) : null}

      {task.status === "failed" && task.errorMessage ? (
        <div className="animate-scale-in rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {formatVisibleErrorMessage(task.errorMessage)}
        </div>
      ) : null}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        {task.resultId ? (
          <Link
            href={`/result/${task.resultId}`}
            className="btn-primary rounded-full px-5 py-3 text-sm font-semibold text-white"
          >
            查看结果
          </Link>
        ) : null}
        {canEdit ? (
          <Link
            href={`/tasks/${task.id}/edit`}
            className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold text-zinc-300"
          >
            编辑任务
          </Link>
        ) : null}
        {task.status === "failed" ? (
          <RetryTaskButton
            taskId={task.id}
            className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold text-zinc-300"
          />
        ) : null}
        <DeleteTaskButton taskId={task.id} redirectTo="/tasks" />
        <Link
          href="/tasks"
          className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold text-zinc-300"
        >
          返回任务列表
        </Link>
        <Link
          href="/upload"
          className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold text-zinc-300"
        >
          新建分析
        </Link>
      </div>
    </div>
  );
}
