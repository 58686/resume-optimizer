"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type DragEvent, type FormEvent } from "react";
import { useToast } from "@/components/toast-provider";
import { readApiResponse } from "@/lib/api-client";
import type { AIProviderId } from "@/lib/ai/types";
import { jobDescriptionTemplates } from "@/lib/job-description-templates";
import { formatVisibleErrorMessage } from "@/lib/model-error";
import { getProviderLabel } from "@/lib/provider-settings";
import { getTaskStatusMeta, type AnalysisTaskStatus } from "@/lib/task-status";

type UploadPayload = { uploadId: string; fileName: string; resumeText: string };
type AnalyzePayload = { taskId: string; status: AnalysisTaskStatus };
type TaskPayload = {
  id: string;
  status: AnalysisTaskStatus;
  progressStage?: string | null;
  progressMessage?: string | null;
  resultId: string | null;
  errorMessage: string | null;
};

type ProviderConfigSummary = {
  id: string;
  name: string;
  provider: AIProviderId;
  values: {
    model: string;
  };
  hasApiKey: boolean;
  isActive: boolean;
};

type ProviderConfigsPayload = {
  activeConfigId: string | null;
  configs: ProviderConfigSummary[];
};

const MAX_FILE_SIZE = 5 * 1024 * 1024;
const ACCEPTED_FILE_TYPES = [".pdf", ".docx", ".txt", ".md"];
const TASK_POLL_INTERVAL_MS = 1500;
const MAX_POLL_ATTEMPTS = 80; // 80 × 1.5s ≈ 2 分钟

function validateFile(file: File | null) {
  if (!file) return "请先上传简历文件。";
  const lowerName = file.name.toLowerCase();
  if (!ACCEPTED_FILE_TYPES.some((extension) => lowerName.endsWith(extension))) {
    return "仅支持 PDF、DOCX、TXT、MD 格式。";
  }
  if (file.size > MAX_FILE_SIZE) return "文件大小不能超过 5MB。";
  return "";
}

function formatSize(size: number) {
  if (size < 1024) return `${size} B`;
  if (size < 1024 * 1024) return `${(size / 1024).toFixed(1)} KB`;
  return `${(size / 1024 / 1024).toFixed(1)} MB`;
}

export function UploadForm() {
  const router = useRouter();
  const toast = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [jobDescription, setJobDescription] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState("");
  const [configs, setConfigs] = useState<ProviderConfigSummary[]>([]);
  const [selectedConfigId, setSelectedConfigId] = useState<string | null>(null);
  const [isConfigLoading, setIsConfigLoading] = useState(true);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [stage, setStage] = useState<"idle" | "uploading" | "submitting">("idle");
  const [taskId, setTaskId] = useState<string | null>(null);
  const [taskStatus, setTaskStatus] = useState<AnalysisTaskStatus | null>(null);
  const [taskProgressMessage, setTaskProgressMessage] = useState<string | null>(null);
  const [taskStreamMode, setTaskStreamMode] = useState<"idle" | "sse" | "poll">("idle");
  const pollAttemptsRef = useRef(0);

  const fileError = validateFile(file);
  const selectedConfig = useMemo(
    () => configs.find((item) => item.id === selectedConfigId) ?? null,
    [configs, selectedConfigId]
  );
  const taskMeta = taskStatus ? getTaskStatusMeta(taskStatus) : null;
  const canGoStep2 = !fileError;
  const canGoStep3 = canGoStep2 && jobDescription.trim().length >= 30;

  const steps = useMemo(
    () => [
      {
        id: 1 as const,
        title: "上传简历",
        desc: file ? `${file.name} · ${formatSize(file.size)}` : "支持 PDF / DOCX / TXT / MD",
        icon: "📄"
      },
      {
        id: 2 as const,
        title: "职位信息",
        desc: jobDescription.trim()
          ? `已填写 ${jobDescription.trim().length} 个字符`
          : "粘贴岗位职责和关键词",
        icon: "💼"
      },
      {
        id: 3 as const,
        title: "AI 配置",
        desc: selectedConfig
          ? `${selectedConfig.name} · ${selectedConfig.values.model}`
          : "选择一组已保存的 AI 配置",
        icon: "🤖"
      }
    ],
    [file, jobDescription, selectedConfig]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadConfigs() {
      try {
        setIsConfigLoading(true);
        const response = await fetch("/api/provider-configs", { cache: "no-store" });
        const data = await readApiResponse<ProviderConfigsPayload>(response);
        if (cancelled) return;

        setConfigs(data.configs);
        setSelectedConfigId(data.activeConfigId ?? data.configs[0]?.id ?? null);
      } catch (loadError) {
        if (cancelled) return;
        setError(loadError instanceof Error ? loadError.message : "加载 AI 配置失败。");
      } finally {
        if (!cancelled) {
          setIsConfigLoading(false);
        }
      }
    }

    void loadConfigs();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!taskId || taskStatus === "succeeded" || taskStatus === "failed") {
      return;
    }

    if (typeof window === "undefined" || typeof EventSource === "undefined") {
      return;
    }

    const source = new EventSource(`/api/tasks/${taskId}/events`);
    setTaskStreamMode("sse");

    source.onmessage = (event) => {
      const data = JSON.parse(event.data) as TaskPayload;
      setTaskStatus(data.status);
      setTaskProgressMessage(data.progressMessage ?? null);

      if (data.status === "succeeded" && data.resultId) {
        toast({
          tone: "success",
          title: "分析完成",
          description: "正在跳转到结果页。"
        });
        source.close();
        router.push(`/result/${data.resultId}`);
        router.refresh();
        return;
      }

      if (data.status === "failed") {
        setError(formatVisibleErrorMessage(data.errorMessage));
        source.close();
      }
    };

    source.onerror = () => {
      setTaskStreamMode("poll");
      source.close();
    };

    return () => {
      source.close();
    };
  }, [router, taskId, taskStatus, toast]);

  useEffect(() => {
    if (!taskId || taskStatus === "succeeded" || taskStatus === "failed" || taskStreamMode === "sse") {
      return;
    }

    if (pollAttemptsRef.current >= MAX_POLL_ATTEMPTS) {
      setError("任务等待超时（约 2 分钟），请前往任务列表查看状态，或重新提交分析。");
      setTaskId(null);
      pollAttemptsRef.current = 0;
      return;
    }

    let cancelled = false;
    const timer = window.setTimeout(async () => {
      pollAttemptsRef.current += 1;
      try {
        const response = await fetch(`/api/tasks/${taskId}`, { cache: "no-store" });
        const data = await readApiResponse<TaskPayload>(response);
        if (cancelled) return;

        setTaskStatus(data.status);
        setTaskProgressMessage(data.progressMessage ?? null);
        setTaskStreamMode("poll");

        if (data.status === "succeeded" && data.resultId) {
          pollAttemptsRef.current = 0;
          toast({
            tone: "success",
            title: "分析完成",
            description: "正在跳转到结果页。"
          });
          router.push(`/result/${data.resultId}`);
          router.refresh();
          return;
        }

        if (data.status === "failed") {
          pollAttemptsRef.current = 0;
          setError(formatVisibleErrorMessage(data.errorMessage));
        }
      } catch (pollError) {
        if (cancelled) return;
        setError(
          formatVisibleErrorMessage(
            pollError instanceof Error ? pollError.message : "刷新任务状态失败。"
          )
        );
      }
    }, TASK_POLL_INTERVAL_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [router, taskId, taskStatus, taskStreamMode, toast]);

  function handleChooseFile(nextFile: File | null) {
    setFile(nextFile);
    setError("");
    if (nextFile) {
      setStep(2);
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragging(false);
    const nextFile = event.dataTransfer.files?.[0] ?? null;
    handleChooseFile(nextFile);
  }

  function applyTemplate(templateId: string) {
    setSelectedTemplateId(templateId);
    const template = jobDescriptionTemplates.find((item) => item.id === templateId);
    if (!template) return;
    setJobDescription(template.content);
    setError("");
    setStep(2);
  }

  function handleNextStep(nextStep: 1 | 2 | 3) {
    if (nextStep === 2 && fileError) {
      setError(fileError);
      return;
    }

    if (nextStep === 3 && jobDescription.trim().length < 30) {
      setError("职位描述至少需要 30 个字符。");
      return;
    }

    setError("");
    setStep(nextStep);
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (isSubmitting) return;

    if (fileError) {
      setError(fileError);
      return;
    }

    if (jobDescription.trim().length < 30) {
      setError("职位描述至少需要 30 个字符。");
      return;
    }

    if (!selectedConfigId) {
      setError("请先选择一组 AI 配置。");
      return;
    }

    try {
      setIsSubmitting(true);
      setError("");
      setStage("uploading");
      setTaskId(null);
      setTaskStatus(null);
      setTaskProgressMessage(null);
      setTaskStreamMode("idle");
      pollAttemptsRef.current = 0;

      const formData = new FormData();
      formData.append("file", file!);

      const uploadResponse = await fetch("/api/upload", {
        method: "POST",
        body: formData
      });
      const uploaded = await readApiResponse<UploadPayload>(uploadResponse);

      setStage("submitting");

      const analyzeResponse = await fetch("/api/analyze", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resumeDocumentId: uploaded.uploadId,
          fileName: uploaded.fileName,
          resumeText: uploaded.resumeText,
          jobDescription: jobDescription.trim(),
          providerConfigId: selectedConfigId
        })
      });

      if (analyzeResponse.status === 429) {
        const retryAfter = analyzeResponse.headers.get("Retry-After");
        const seconds = retryAfter ? parseInt(retryAfter, 10) : null;
        throw new Error(
          seconds
            ? `分析次数已达上限，请 ${seconds} 秒后再试（约 ${Math.ceil(seconds / 60)} 分钟）。`
            : "分析请求过于频繁，请稍后再试。"
        );
      }

      const analyzed = await readApiResponse<AnalyzePayload>(analyzeResponse);
      setTaskId(analyzed.taskId);
      setTaskStatus(analyzed.status);
      setTaskProgressMessage("任务已提交，正在进入分析流程。");
      toast({
        tone: "info",
        title: "任务已创建",
        description: "系统开始异步分析简历。"
      });
    } catch (submitError) {
      setError(
        formatVisibleErrorMessage(
          submitError instanceof Error ? submitError.message : "发起分析失败。"
        )
      );
    } finally {
      setIsSubmitting(false);
      setStage("idle");
    }
  }

  return (
    <form className="space-y-8" onSubmit={handleSubmit}>
      {/* Step indicators */}
      <div className="grid gap-3 md:grid-cols-3">
        {steps.map((item) => {
          const isActive = step === item.id;
          const isDone = item.id < step;

          return (
            <button
              key={item.id}
              type="button"
              onClick={() => handleNextStep(item.id)}
              className={`card-hover rounded-[1.5rem] border p-4 text-left transition-all duration-300 ${
                isActive
                  ? "border-brand-accent/50 bg-gradient-to-br from-brand-gradient-start/20 to-brand-gradient-end/20 text-white shadow-glow-md"
                  : isDone
                    ? "border-emerald-500/30/60 bg-emerald-500/10/70 text-emerald-900"
                    : "border-zinc-800 bg-zinc-900/40 text-zinc-300 hover:border-zinc-700"
              }`}
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-semibold uppercase tracking-[0.24em] opacity-70">Step {item.id}</p>
                <span className="text-lg">{isDone ? "✓" : item.icon}</span>
              </div>
              <p className="mt-2 text-base font-bold">{item.title}</p>
              <p className="mt-1.5 text-sm opacity-75">{item.desc}</p>
            </button>
          );
        })}
      </div>

      {/* Step 1: Upload */}
      <section className="rounded-[2rem] border border-zinc-500/40 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Step 1</p>
            <h3 className="mt-2 text-xl font-bold text-white">上传简历文件</h3>
          </div>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="btn-secondary rounded-full px-4 py-2 text-sm font-semibold text-zinc-300"
          >
            选择文件
          </button>
        </div>

        <div
          onDragEnter={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragOver={(event) => event.preventDefault()}
          onDragLeave={(event) => {
            event.preventDefault();
            setDragging(false);
          }}
          onDrop={handleDrop}
          className={`mt-6 rounded-[2rem] border-2 border-dashed px-6 py-10 text-center transition-all duration-300 ${
            dragging
              ? "border-brand-accent bg-brand-accent/10 shadow-[0_0_20px_rgba(214,169,109,0.15)]"
              : file
                ? "border-emerald-500/50 bg-emerald-500/100/10"
                : "border-zinc-700 bg-zinc-900/30"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FILE_TYPES.join(",")}
            className="hidden"
            onChange={(event) => handleChooseFile(event.target.files?.[0] ?? null)}
          />
          <div className="text-3xl">{file ? "📄" : "📁"}</div>
          <p className="mt-3 text-base font-bold text-white">
            {file ? file.name : "拖拽简历到这里，或点击选择文件"}
          </p>
          <p className="mt-2 text-sm text-zinc-400">支持 PDF、DOCX、TXT、MD，单文件不超过 5MB。</p>
          {file ? <p className="mt-3 text-sm font-medium text-zinc-300">文件大小：{formatSize(file.size)}</p> : null}
        </div>
      </section>

      {/* Step 2: Job Description */}
      <section className="rounded-[2rem] border border-zinc-500/40 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Step 2</p>
            <h3 className="mt-2 text-xl font-bold text-white">填写职位信息</h3>
          </div>
          <button
            type="button"
            onClick={() => handleNextStep(3)}
            className="btn-secondary rounded-full px-4 py-2 text-sm font-semibold text-zinc-300"
          >
            下一步
          </button>
        </div>

        <textarea
          value={jobDescription}
          onChange={(event) => {
            setJobDescription(event.target.value);
            setError("");
          }}
          placeholder="粘贴职位职责、任职要求、关键词和期望经验。"
          rows={14}
          className="input-glow mt-6 min-h-[320px] w-full resize-y rounded-[2rem] border border-zinc-800 bg-zinc-900/50 px-5 py-4 text-sm leading-7 text-zinc-300 placeholder:text-zinc-400"
        />
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <label className="text-sm font-semibold text-zinc-300">职位模板</label>
          <select
            value={selectedTemplateId}
            onChange={(event) => applyTemplate(event.target.value)}
            className="input-glow rounded-full border border-zinc-800 bg-zinc-900/50 px-4 py-2 text-sm text-zinc-300"
          >
            <option value="">选择常用 JD 模板</option>
            {jobDescriptionTemplates.map((template) => (
              <option key={template.id} value={template.id}>
                {template.name} · {template.summary}
              </option>
            ))}
          </select>
        </div>
        <p className="mt-2 text-sm text-zinc-400">建议至少 30 个字符，越完整越利于匹配。</p>
      </section>

      {/* Step 3: AI Config */}
      <section className="rounded-[2rem] border border-zinc-500/40 bg-zinc-900/50 p-6 backdrop-blur-sm">
        <div className="flex items-center justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Step 3</p>
            <h3 className="mt-2 text-xl font-bold text-white">选择 AI 配置</h3>
          </div>
          <Link
            href="/providers"
            className="btn-secondary rounded-full px-4 py-2 text-sm font-semibold text-zinc-300"
          >
            管理配置
          </Link>
        </div>

        {isConfigLoading ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-700 bg-zinc-900/50 px-5 py-8 text-sm text-zinc-400">
            <div className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              正在加载 AI 配置...
            </div>
          </div>
        ) : configs.length === 0 ? (
          <div className="mt-6 rounded-[1.5rem] border border-dashed border-zinc-700 bg-zinc-900/50 px-5 py-8 text-sm text-zinc-400">
            还没有可用的 AI 配置。请先去
            <Link href="/providers" className="mx-1 font-semibold text-white underline underline-offset-4">
              AI 配置模块
            </Link>
            创建一组。
          </div>
        ) : (
          <div className="mt-6 space-y-4">
            <div>
              <label className="block text-sm font-semibold text-zinc-300">使用哪组配置</label>
              <select
                value={selectedConfigId ?? ""}
                onChange={(event) => setSelectedConfigId(event.target.value || null)}
                className="input-glow mt-2 block w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
              >
                {configs.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} · {getProviderLabel(item.provider)} · {item.values.model}
                    {item.isActive ? "（当前默认）" : ""}
                  </option>
                ))}
              </select>
            </div>

            {selectedConfig ? (
              <div className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/50 p-5">
                <div className="flex flex-wrap items-center gap-2">
                  <h4 className="text-base font-bold text-white">{selectedConfig.name}</h4>
                  {selectedConfig.isActive ? (
                    <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-400">
                      当前默认
                    </span>
                  ) : null}
                </div>
                <p className="mt-3 text-sm text-zinc-400">供应商：{getProviderLabel(selectedConfig.provider)}</p>
                <p className="mt-1 text-sm text-zinc-400">模型：{selectedConfig.values.model}</p>
                <p className="mt-1 text-sm text-zinc-400">
                  API Key：{selectedConfig.hasApiKey ? "已保存" : "未保存，分析时将回退到服务端 .env"}
                </p>
              </div>
            ) : null}
          </div>
        )}
      </section>

      {/* Task status panel */}
      {taskId && taskMeta ? (
        <section className={`animate-scale-in rounded-[2rem] border p-5 text-sm ${taskMeta.panelClass}`}>
          <div className="flex flex-wrap items-center gap-3">
            <span className={`rounded-full border px-3 py-1 text-xs font-semibold ${taskMeta.badgeClass}`}>
              {taskMeta.label}
            </span>
            <span className="text-zinc-400">任务 ID：{taskId}</span>
            <Link href={`/tasks/${taskId}`} className="font-semibold underline underline-offset-4">
              查看任务详情
            </Link>
          </div>
          <p className="mt-3">{taskMeta.description}</p>
          {taskProgressMessage ? <p className="mt-2 opacity-80">{taskProgressMessage}</p> : null}
          <p className="mt-2 text-xs opacity-60">
            {taskStreamMode === "sse"
              ? "实时流式更新中"
              : taskStreamMode === "poll"
                ? "流式连接中断，已回退到轮询"
                : "等待连接任务流"}
          </p>
        </section>
      ) : null}

      {/* Error */}
      {error ? (
        <div className="animate-scale-in rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      ) : null}

      {/* Submit area */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="text-sm text-zinc-400">
          {stage === "uploading"
            ? "正在上传并提取简历文本..."
            : stage === "submitting"
              ? "正在创建分析任务..."
              : "准备完成后即可发起分析。"}
        </div>
        <button
          type="submit"
          disabled={isSubmitting || !canGoStep3 || !selectedConfigId}
          className="btn-primary rounded-full px-7 py-3.5 text-sm font-semibold text-white"
        >
          {isSubmitting ? (
            <span className="flex items-center gap-2">
              <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-500 border-t-transparent" />
              提交中...
            </span>
          ) : "开始分析 →"}
        </button>
      </div>
    </form>
  );
}
