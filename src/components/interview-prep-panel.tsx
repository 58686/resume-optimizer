"use client";

import { useMemo, useState } from "react";
import { useToast } from "@/components/toast-provider";
import { readApiResponse } from "@/lib/api-client";
import {
  exportInterviewPrepMarkdown,
  exportInterviewPrepPdf,
  exportInterviewPrepDocx
} from "@/lib/interview-prep-export";
import type { InterviewPrepQuestion } from "@/types/analysis";
import { categoryLabels, difficultyLabels } from "@/types/analysis";
import { jobDescriptionTemplates } from "@/lib/job-description-templates";

type CategoryKey = InterviewPrepQuestion["category"];
type DifficultyKey = InterviewPrepQuestion["difficulty"];

const ALL_CATEGORIES: CategoryKey[] = [
  "technical",
  "project",
  "behavioral",
  "hr",
  "system_design",
  "open_ended"
];

const difficultyColors: Record<DifficultyKey, string> = {
  basic: "border-emerald-200/60 bg-emerald-50/70 text-emerald-700",
  intermediate: "border-amber-200/60 bg-amber-50/70 text-amber-700",
  advanced: "border-red-200/60 bg-red-50/70 text-red-700"
};

const categoryAccent: Record<CategoryKey, string> = {
  technical: "bg-blue-500",
  project: "bg-violet-500",
  behavioral: "bg-orange-400",
  hr: "bg-teal-400",
  system_design: "bg-indigo-500",
  open_ended: "bg-pink-400"
};

const categoryBadge: Record<CategoryKey, string> = {
  technical: "bg-blue-500/10 text-blue-400 ring-1 ring-blue-500/20",
  project: "bg-violet-500/10 text-violet-400 ring-1 ring-violet-500/20",
  behavioral: "bg-orange-400/10 text-orange-400 ring-1 ring-orange-400/20",
  hr: "bg-teal-400/10 text-teal-400 ring-1 ring-teal-400/20",
  system_design: "bg-indigo-500/10 text-indigo-400 ring-1 ring-indigo-500/20",
  open_ended: "bg-pink-400/10 text-pink-400 ring-1 ring-pink-400/20"
};

type ProviderConfigOption = {
  id: string;
  name: string;
};

export function InterviewPrepPanel({
  providerConfigs,
  initialResumeText,
  initialJobDescription
}: {
  providerConfigs: ProviderConfigOption[];
  initialResumeText?: string;
  initialJobDescription?: string;
}) {
  const toast = useToast();
  const [resumeText, setResumeText] = useState(initialResumeText ?? "");
  const [jobDescription, setJobDescription] = useState(initialJobDescription ?? "");
  const [providerConfigId, setProviderConfigId] = useState(providerConfigs[0]?.id ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingCategory, setGeneratingCategory] = useState<CategoryKey | null>(null);
  const [questions, setQuestions] = useState<InterviewPrepQuestion[]>([]);
  const [activeCategory, setActiveCategory] = useState<CategoryKey | "all">("all");
  const [activeDifficulty, setActiveDifficulty] = useState<DifficultyKey | "all">("all");
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);
  const [jdUrl, setJdUrl] = useState("");
  const [isScraping, setIsScraping] = useState(false);

  const filteredQuestions = useMemo(() => {
    return questions.filter((q) => {
      if (activeCategory !== "all" && q.category !== activeCategory) return false;
      if (activeDifficulty !== "all" && q.difficulty !== activeDifficulty) return false;
      return true;
    });
  }, [questions, activeCategory, activeDifficulty]);

  const categoryStats = useMemo(() => {
    const stats = new Map<CategoryKey, number>();
    for (const q of questions) {
      stats.set(q.category, (stats.get(q.category) ?? 0) + 1);
    }
    return stats;
  }, [questions]);

  async function handleGenerate() {
    if (!resumeText.trim() || !jobDescription.trim()) {
      toast({ tone: "error", title: "请填写内容", description: "简历文本和职位描述不能为空。" });
      return;
    }
    if (!providerConfigId) {
      toast({ tone: "error", title: "请选择 AI 配置", description: "需要选择一个 AI 配置才能生成面试题。" });
      return;
    }

    try {
      setIsGenerating(true);
      setGeneratingCategory(null);
      setQuestions([]);
      setExpandedIndex(null);

      const response = await fetch("/api/interview-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          resumeText: resumeText.trim(),
          jobDescription: jobDescription.trim(),
          providerConfigId
        })
      });

      if (!response.ok || !response.body) {
        const text = await response.text();
        let message = "生成面试题失败";
        try {
          const json = JSON.parse(text);
          message = json?.error?.message || message;
        } catch {}
        throw new Error(message);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let eventType = "";
      let dataLines: string[] = [];
      let totalQuestions = 0;
      let hasError = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            eventType = line.slice(7).trim();
          } else if (line.startsWith("data: ")) {
            dataLines.push(line.slice(6));
          } else if (line === "") {
            if (eventType && dataLines.length > 0) {
              try {
                const data = JSON.parse(dataLines.join("\n"));

                if (eventType === "progress") {
                  setGeneratingCategory(data.category as CategoryKey);
                } else if (eventType === "questions") {
                  if (Array.isArray(data.questions) && data.questions.length > 0) {
                    setQuestions((prev) => [...prev, ...data.questions]);
                  }
                } else if (eventType === "done") {
                  totalQuestions = data.totalQuestions ?? 0;
                  setGeneratingCategory(null);
                } else if (eventType === "error") {
                  if (data.fatal) {
                    hasError = true;
                    throw new Error(data.message || "生成失败");
                  } else {
                    toast({ tone: "error", title: `${data.category} 分类生成失败`, description: data.message });
                  }
                }
              } catch (parseError) {
                if (hasError) throw parseError;
              }
            }
            eventType = "";
            dataLines = [];
          }
        }
      }

      setActiveCategory("all");
      setActiveDifficulty("all");

      if (totalQuestions === 0) {
        toast({ tone: "error", title: "生成结果为空", description: "AI 未返回任何面试题，请检查终端日志或尝试更换 AI 配置。" });
      } else {
        toast({ tone: "success", title: "面试题已生成", description: `共生成 ${totalQuestions} 道面试题。` });
      }
    } catch (error) {
      toast({ tone: "error", title: "生成失败", description: error instanceof Error ? error.message : "生成面试题时出错。" });
    } finally {
      setIsGenerating(false);
      setGeneratingCategory(null);
    }
  }

  function handleExportMarkdown() {
    exportInterviewPrepMarkdown(questions);
    toast({ tone: "success", title: "Markdown 已导出" });
  }

  function handleExportPdf() {
    toast({ tone: "info", title: "即将打开打印面板", description: "你可以在浏览器里保存为 PDF。" });
    exportInterviewPrepPdf();
  }

  function handleExportDocx() {
    exportInterviewPrepDocx(questions);
    toast({ tone: "success", title: "Word 文档已导出" });
  }

  function toggleExpand(index: number) {
    setExpandedIndex(expandedIndex === index ? null : index);
  }

  async function handleScrapeJd() {
    if (!jdUrl.trim()) return;
    try {
      setIsScraping(true);
      const response = await fetch("/api/scrape-jd", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: jdUrl.trim() })
      });
      const data = await readApiResponse<{ text: string; length: number }>(response);
      setJobDescription(data.text);
      setJdUrl("");
      toast({ tone: "success", title: "抓取成功", description: `已提取 ${data.length} 个字符，请核对内容后再生成。` });
    } catch (error) {
      toast({ tone: "error", title: "抓取失败", description: error instanceof Error ? error.message : "请手动粘贴职位描述。" });
    } finally {
      setIsScraping(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* ── Input card ── */}
      <section className="animate-slide-up rounded-[2rem] border border-zinc-800 glass-panel p-6 backdrop-blur-sm">
        <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Interview Prep</p>
        <h2 className="mt-1.5 text-2xl font-bold text-white">模拟完整面试流程</h2>
        <p className="mt-1.5 text-sm leading-6 text-zinc-400">
          AI 同时扮演 HR 和技术面试官，生成 35–50 道针对性题目，覆盖六大维度，附参考答案与回答要点。
        </p>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">简历正文</label>
              <span className="text-xs tabular-nums text-zinc-600">{resumeText.length} 字</span>
            </div>
            <textarea
              value={resumeText}
              onChange={(e) => setResumeText(e.target.value)}
              placeholder="在此粘贴简历正文..."
              className="min-h-[260px] w-full resize-none rounded-[1.5rem] border border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm leading-6 text-zinc-300 outline-none transition focus:border-zinc-500 input-glow"
            />
          </div>
          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-sm font-medium text-zinc-300">目标职位描述</label>
              <span className="text-xs tabular-nums text-zinc-600">{jobDescription.length} 字</span>
            </div>
            {/* URL scrape */}
            <div className="flex gap-2">
              <input
                type="url"
                value={jdUrl}
                onChange={(e) => setJdUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && void handleScrapeJd()}
                placeholder="粘贴招聘页面链接自动提取 JD…"
                className="min-w-0 flex-1 rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-xs text-zinc-300 outline-none transition focus:border-zinc-500 input-glow"
              />
              <button
                type="button"
                onClick={() => void handleScrapeJd()}
                disabled={isScraping || !jdUrl.trim()}
                className="shrink-0 rounded-xl btn-primary px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              >
                {isScraping ? (
                  <span className="flex items-center gap-1.5">
                    <span className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-white/30 border-t-white" />
                    抓取中
                  </span>
                ) : "自动提取"}
              </button>
            </div>
            {/* Quick template cards */}
            <div className="flex flex-wrap gap-2">
              {jobDescriptionTemplates.map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  onClick={() => setJobDescription(tpl.content)}
                  className={`rounded-full border px-3 py-1 text-xs font-semibold transition ${
                    jobDescription === tpl.content
                      ? "border-zinc-500 bg-zinc-700 text-white"
                      : "border-zinc-700 bg-zinc-900/50 text-zinc-400 hover:border-zinc-500 hover:text-zinc-200"
                  }`}
                >
                  {tpl.name}
                  <span className="ml-1.5 opacity-50">{tpl.summary.split(" / ")[0]}</span>
                </button>
              ))}
            </div>
            {/* Textarea with clear button */}
            <div className="relative">
              <textarea
                value={jobDescription}
                onChange={(e) => setJobDescription(e.target.value)}
                placeholder="选择上方模板快速填充，或直接粘贴 JD 内容..."
                className="min-h-[260px] w-full resize-none rounded-[1.5rem] border border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm leading-6 text-zinc-300 outline-none transition focus:border-zinc-500 input-glow"
              />
              {jobDescription && (
                <button
                  type="button"
                  onClick={() => setJobDescription("")}
                  aria-label="清空职位描述"
                  className="absolute right-3 top-3 flex h-6 w-6 items-center justify-center rounded-full bg-zinc-700 text-zinc-400 transition hover:bg-zinc-600 hover:text-white"
                >
                  <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <select
            value={providerConfigId}
            onChange={(e) => setProviderConfigId(e.target.value)}
            className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2.5 text-sm text-zinc-300 outline-none transition focus:border-zinc-500 input-glow"
          >
            {providerConfigs.map((config) => (
              <option key={config.id} value={config.id}>{config.name}</option>
            ))}
          </select>
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className="btn-primary rounded-full px-7 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                {generatingCategory ? `正在生成 ${categoryLabels[generatingCategory].replace(/^[^\s]+\s/, "")}...` : "准备中..."}
              </span>
            ) : (
              "生成面试题 →"
            )}
          </button>
        </div>
      </section>

      {/* ── Results ── */}
      {questions.length > 0 && (
        <>
          {/* Category pill tabs */}
          <section className="animate-slide-up rounded-[2rem] border border-zinc-800 glass-panel px-5 py-3.5 backdrop-blur-sm">
            <div className="flex items-center gap-2 overflow-x-auto pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <button
                type="button"
                onClick={() => setActiveCategory("all")}
                className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                  activeCategory === "all"
                    ? "btn-primary text-white shadow-md"
                    : "border border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                }`}
              >
                全部
                <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                  activeCategory === "all" ? "bg-white/20" : "bg-zinc-700 text-zinc-300"
                }`}>
                  {questions.length}
                </span>
              </button>
              {ALL_CATEGORIES.map((cat) => {
                const count = categoryStats.get(cat) ?? 0;
                if (count === 0) return null;
                const isActive = activeCategory === cat;
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setActiveCategory(isActive ? "all" : cat)}
                    className={`flex shrink-0 items-center gap-2 rounded-full px-4 py-1.5 text-sm font-semibold transition ${
                      isActive
                        ? "btn-primary text-white shadow-md"
                        : "border border-zinc-700 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200"
                    }`}
                  >
                    {categoryLabels[cat]}
                    <span className={`rounded-full px-1.5 py-0.5 text-xs font-bold tabular-nums ${
                      isActive ? "bg-white/20" : "bg-zinc-700 text-zinc-300"
                    }`}>
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          {/* Difficulty filter + Export */}
          <section className="animate-slide-up flex flex-wrap items-center justify-between gap-4 rounded-[2rem] border border-zinc-800 glass-panel px-6 py-3.5 backdrop-blur-sm">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">难度</span>
              {(["all", "basic", "intermediate", "advanced"] as const).map((d) => (
                <button
                  key={d}
                  type="button"
                  onClick={() => setActiveDifficulty(d)}
                  className={`rounded-full px-3.5 py-1 text-xs font-semibold transition ${
                    activeDifficulty === d
                      ? "btn-primary text-white shadow-md"
                      : "border border-zinc-800 bg-zinc-900/50 text-zinc-400 hover:border-zinc-600 hover:text-zinc-200"
                  }`}
                >
                  {d === "all" ? "全部" : difficultyLabels[d]}
                </button>
              ))}
              <span className="ml-1 text-xs tabular-nums text-zinc-600">
                {filteredQuestions.length} / {questions.length}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-600">导出</span>
              <button type="button" onClick={handleExportMarkdown} className="btn-secondary rounded-full px-4 py-1.5 text-xs font-semibold text-zinc-300">
                Markdown
              </button>
              <button type="button" onClick={handleExportDocx} className="btn-secondary rounded-full px-4 py-1.5 text-xs font-semibold text-zinc-300">
                Word
              </button>
              <button type="button" onClick={handleExportPdf} className="btn-primary rounded-full px-4 py-1.5 text-xs font-semibold text-white">
                PDF
              </button>
            </div>
          </section>

          {/* Questions list */}
          <section className="space-y-3 print:space-y-6" id="interview-prep-print-area">
            {filteredQuestions.map((q, index) => {
              const isExpanded = expandedIndex === index;
              return (
                <article
                  key={`${q.question}-${index}`}
                  className="animate-slide-up overflow-hidden rounded-2xl border border-zinc-800 glass-panel backdrop-blur-sm transition-shadow hover:border-zinc-700"
                >
                  {/* Header row */}
                  <div className="flex items-start gap-4 p-5">
                    {/* Number + accent line */}
                    <div className="flex flex-col items-center gap-1.5 pt-0.5 self-stretch">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-zinc-800 text-xs font-bold tabular-nums text-zinc-400">
                        {index + 1}
                      </span>
                      <div className={`flex-1 w-0.5 rounded-full ${categoryAccent[q.category]} opacity-30`} />
                    </div>
                    {/* Question + tags */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-semibold ${categoryBadge[q.category]}`}>
                          {categoryLabels[q.category]}
                        </span>
                        <span className={`rounded-full border px-2.5 py-0.5 text-xs font-semibold ${difficultyColors[q.difficulty]}`}>
                          {difficultyLabels[q.difficulty]}
                        </span>
                      </div>
                      <h3 className="mt-2.5 text-base font-semibold leading-snug text-white">
                        {q.question}
                      </h3>
                    </div>
                    {/* Expand toggle */}
                    <button
                      type="button"
                      onClick={() => toggleExpand(index)}
                      aria-label={isExpanded ? "收起" : "展开答案"}
                      className="mt-0.5 shrink-0 flex h-8 w-8 items-center justify-center rounded-full border border-zinc-700 bg-zinc-900/50 text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
                    >
                      <svg
                        className={`h-4 w-4 transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}
                        fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                    </button>
                  </div>

                  {/* Expandable answer panel */}
                  {isExpanded && (
                    <div className="border-t border-zinc-800 bg-zinc-900/30 px-5 py-5">
                      <div className="grid gap-6 lg:grid-cols-[1fr_auto_1fr]">
                        <div>
                          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                            参考答案
                          </p>
                          <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                            {q.sampleAnswer}
                          </p>
                        </div>
                        <div className="hidden w-px bg-zinc-800 lg:block" />
                        <div>
                          <p className="mb-2.5 text-[10px] font-bold uppercase tracking-[0.25em] text-zinc-500">
                            回答要点
                          </p>
                          <ul className="space-y-2">
                            {q.keyPoints.map((point, i) => (
                              <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-zinc-300">
                                <span className={`mt-2 h-1.5 w-1.5 shrink-0 rounded-full ${categoryAccent[q.category]}`} />
                                {point}
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>
                    </div>
                  )}
                </article>
              );
            })}
          </section>
        </>
      )}

      {/* Empty state */}
      {questions.length === 0 && !isGenerating && (
        <section className="animate-fade-in rounded-[2rem] border border-dashed border-zinc-800 glass-panel p-16 text-center">
          <div className="mx-auto max-w-md">
            <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-zinc-800/60">
              <span className="text-3xl">🎯</span>
            </div>
            <h3 className="text-xl font-bold text-white">准备好了吗？</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-500">
              填写简历和职位描述，AI 将模拟 HR + 技术面试官视角，生成 35–50 道个性化题目，
              覆盖{" "}
              <span className="text-zinc-400">HR 面试 · 技术基础 · 项目深挖 · 行为面试 · 系统设计 · 开放性问题</span>{" "}
              六大维度。
            </p>
          </div>
        </section>
      )}

      {/* Loading state - only show when no questions yet */}
      {isGenerating && questions.length === 0 && (
        <section className="animate-fade-in rounded-[2rem] border border-zinc-800 glass-panel p-16 text-center backdrop-blur-sm">
          <div className="mx-auto max-w-sm">
            <div className="mx-auto h-12 w-12 animate-spin rounded-full border-[3px] border-zinc-700 border-t-white" />
            <h3 className="mt-6 text-lg font-bold text-white">
              {generatingCategory
                ? `正在生成${categoryLabels[generatingCategory].replace(/^[^\s]+\s/, "")}...`
                : "准备中..."}
            </h3>
            <p className="mt-2 text-sm leading-6 text-zinc-500">
              按分类逐批生成，HR · 技术 · 项目 · 行为 · 系统设计 · 开放性问题。
              <br />题目会陆续出现，无需等待全部完成。
            </p>
          </div>
        </section>
      )}

      {/* Generating progress bar - show when questions are coming in */}
      {isGenerating && questions.length > 0 && generatingCategory && (
        <section className="animate-fade-in rounded-2xl border border-zinc-800 glass-panel px-6 py-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-zinc-600 border-t-white" />
            <span className="text-sm text-zinc-400">
              正在生成
              <span className="mx-1 font-semibold text-zinc-200">
                {categoryLabels[generatingCategory]}
              </span>
              · 已生成 {questions.length} 道题目
            </span>
          </div>
        </section>
      )}
    </div>
  );
}
