"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { AnalysisResult } from "@/types/analysis";
import { useToast } from "@/components/toast-provider";

type ResultInteractionsProps = {
  analysisId?: string;
  fileName: string | null;
  score: number | null;
  createdAt: string;
  analysis: AnalysisResult;
  onSearchKeyword?: (keyword: string) => void;
  onInjectKeyword?: (keyword: string) => void;
};

type PriorityItem = {
  title: string;
  description: string;
  toneClass: string;
};

function buildMarkdownReport({ fileName, score, createdAt, analysis }: ResultInteractionsProps) {
  const lines = [
    "# 简历分析报告",
    "",
    `- 文件名：${fileName || "未命名文件"}`,
    `- 匹配分：${score ?? "--"}`,
    `- 创建时间：${createdAt}`,
    "",
    "## 已命中关键词",
    ...(analysis.matchedKeywords.length > 0 ? analysis.matchedKeywords.map((item) => `- ${item}`) : ["- 暂无"]),
    "",
    "## 待补充关键词",
    ...(analysis.missingKeywords.length > 0 ? analysis.missingKeywords.map((item) => `- ${item}`) : ["- 暂无"]),
    "",
    "## 优化建议",
    ...(analysis.suggestions.length > 0 ? analysis.suggestions.map((item) => `- ${item}`) : ["- 暂无"]),
    "",
    "## 改写后的个人总结",
    analysis.rewrittenSummary || "暂无",
    "",
    "## 项目改写建议"
  ];

  if (analysis.rewrittenProjects.length > 0) {
    analysis.rewrittenProjects.forEach((project, index) => {
      lines.push(`### ${project.title || `项目 ${index + 1}`}`);
      lines.push("");
      lines.push("**Before**");
      lines.push(project.before || "暂无");
      lines.push("");
      lines.push("**After**");
      lines.push(project.after || "暂无");
      lines.push("");
    });
  } else {
    lines.push("暂无", "");
  }

  lines.push("## 面试问答准备");

  if (analysis.interviewQuestions.length > 0) {
    analysis.interviewQuestions.forEach((item, index) => {
      lines.push(`### ${index + 1}. ${item.question}`);
      lines.push(item.answer || "暂无");
      lines.push("");
    });
  } else {
    lines.push("暂无", "");
  }

  return lines.join("\n");
}

function buildEmailSummary({ fileName, score, analysis }: ResultInteractionsProps) {
  const topMatched = analysis.matchedKeywords.slice(0, 5).join("、") || "暂无";
  const topMissing = analysis.missingKeywords.slice(0, 3).join("、") || "暂无";
  const topSuggestions = analysis.suggestions.slice(0, 3).map((item) => `- ${item}`);

  return [
    "你好，",
    "",
    "我基于目标岗位对简历做了一轮匹配分析，整理出一版适合求职沟通的摘要：",
    "",
    `- 简历文件：${fileName || "未命名文件"}`,
    `- 岗位匹配分：${score ?? "--"}`,
    `- 已命中关键词：${topMatched}`,
    `- 建议补充关键词：${topMissing}`,
    "",
    "本轮优化重点包括：",
    ...(topSuggestions.length > 0 ? topSuggestions : ["- 已补强关键词表达和项目成果描述"]),
    "",
    "如方便，希望进一步沟通该岗位的核心要求与匹配点。",
    "",
    "谢谢。"
  ].join("\n");
}

function getScorePriorityItems(score: number | null, analysis: AnalysisResult): PriorityItem[] {
  const topMissing = analysis.missingKeywords.slice(0, 3);
  const topSuggestion = analysis.suggestions[0];
  const projectCount = analysis.rewrittenProjects.length;

  if (score === null) {
    return [
      {
        title: "先检查结果完整性",
        description: "这次分析没有返回有效分数，建议优先确认模型输出是否完整。",
        toneClass: "border-zinc-800 bg-zinc-900/30 text-zinc-300"
      }
    ];
  }

  if (score < 60) {
    return [
      {
        title: "先补缺失关键词",
        description: topMissing.length > 0 ? `优先把 ${topMissing.join("、")} 补到简历里。` : "优先补足 JD 中尚未覆盖的核心关键词。",
        toneClass: "border-red-200/60 bg-red-50/70 text-red-700"
      },
      {
        title: "再改项目描述",
        description: projectCount > 0 ? `本次已生成 ${projectCount} 条项目改写建议，优先替换弱表达。` : "把项目结果写成可量化成果，而不是职责罗列。",
        toneClass: "border-amber-200/60 bg-amber-50/70 text-amber-700"
      },
      {
        title: "最后打磨总结",
        description: topSuggestion || "个人总结要直接对齐目标岗位的核心要求。",
        toneClass: "border-zinc-800 bg-zinc-900/30 text-zinc-300"
      }
    ];
  }

  if (score < 80) {
    return [
      {
        title: "优先补强高频关键词",
        description: topMissing.length > 0 ? `本轮最值得补齐的是 ${topMissing.join("、")}。` : "优先检查岗位关键词覆盖是否足够集中。",
        toneClass: "border-amber-200/60 bg-amber-50/70 text-amber-700"
      },
      {
        title: "强化项目成果表达",
        description: topSuggestion || "把已有项目改写成更贴近岗位成果的表达。",
        toneClass: "border-zinc-800 bg-zinc-900/30 text-zinc-300"
      },
      {
        title: "准备面试追问",
        description: analysis.interviewQuestions.length > 0 ? "本页底部已有面试问答，可顺手整理成口述版本。" : "结合简历重点，提前准备 3 到 5 个项目追问。",
        toneClass: "border-zinc-800 bg-zinc-900/30 text-zinc-300"
      }
    ];
  }

  return [
    {
      title: "先微调措辞",
      description: topSuggestion || "匹配度已经较高，建议重点优化表述密度和专业感。",
      toneClass: "border-emerald-200/60 bg-emerald-50/70 text-emerald-700"
    },
    {
      title: "补充量化成果",
      description: projectCount > 0 ? "优先吸收项目改写中的量化表达，让经历更有说服力。" : "检查是否还有可量化的成果未写进去。",
      toneClass: "border-zinc-800 bg-zinc-900/30 text-zinc-300"
    },
    {
      title: "准备投递版本",
      description: "现在已经接近可投递状态，建议整理成最终 PDF 并开始定向投递。",
      toneClass: "border-zinc-800 bg-zinc-900/30 text-zinc-300"
    }
  ];
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const toast = useToast();
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      toast({ tone: "success", title: "已复制", description: `${label}已复制到剪贴板。` });
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ tone: "error", title: "复制失败", description: "浏览器未允许访问剪贴板。" });
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`btn-secondary rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        copied ? "border-emerald-300 bg-emerald-50 text-emerald-700" : "text-zinc-300"
      }`}
    >
      {copied ? "✓ 已复制" : label}
    </button>
  );
}

function KeywordChip({
  keyword,
  tone,
  size,
  onSearch,
  onInject
}: {
  keyword: string;
  tone: "matched" | "missing";
  size: "lg" | "md" | "sm";
  onSearch?: (keyword: string) => void;
  onInject?: (keyword: string) => void;
}) {
  const styleByTone =
    tone === "matched"
      ? "border-emerald-200/60 bg-emerald-50/70 text-emerald-700"
      : "border-amber-200/60 bg-amber-50/70 text-amber-800";
  const sizeClass = size === "lg" ? "px-4 py-2 text-base" : size === "md" ? "px-3 py-1.5 text-sm" : "px-2.5 py-1 text-xs";

  return (
    <div className={`flex items-center gap-2 rounded-full border transition-transform hover:scale-105 ${styleByTone} ${sizeClass}`}>
      <span className="font-medium">{keyword}</span>
      {onSearch ? (
        <button type="button" onClick={() => onSearch(keyword)} className="text-[11px] underline underline-offset-2 opacity-70 hover:opacity-100">
          搜索
        </button>
      ) : null}
      {onInject ? (
        <button type="button" onClick={() => onInject(keyword)} className="text-[11px] underline underline-offset-2 opacity-70 hover:opacity-100">
          注入
        </button>
      ) : null}
    </div>
  );
}

function KeywordCoverageBar({ matched, missing }: { matched: number; missing: number }) {
  const total = matched + missing;
  const pct = total > 0 ? Math.round((matched / total) * 100) : 0;
  const color = pct >= 80 ? "bg-emerald-500" : pct >= 50 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="mb-5 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
      <div className="flex items-center justify-between text-sm">
        <span className="font-semibold text-zinc-300">关键词覆盖率</span>
        <span className="font-bold text-white">{pct}%</span>
      </div>
      <div className="mt-2 h-2.5 w-full overflow-hidden rounded-full bg-zinc-800">
        <div className={`progress-bar-fill h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">已命中 {matched} 个，缺失 {missing} 个，共 {total} 个关键词</p>
    </div>
  );
}

function DimensionScoreCards({ analysis }: { analysis: AnalysisResult }) {
  const total = analysis.matchedKeywords.length + analysis.missingKeywords.length;
  const kwPct = total > 0 ? Math.round((analysis.matchedKeywords.length / total) * 100) : 0;
  const sugLevel = analysis.suggestions.length <= 2 ? 90 : analysis.suggestions.length <= 4 ? 60 : 30;
  const projPct = analysis.rewrittenProjects.length > 0 ? Math.min(analysis.rewrittenProjects.length * 33, 100) : 0;
  const intPct = analysis.interviewQuestions.length > 0 ? Math.min(analysis.interviewQuestions.length * 20, 100) : 0;

  const dims = [
    { label: "关键词覆盖", value: kwPct, color: kwPct >= 70 ? "text-emerald-600" : "text-amber-600" },
    { label: "建议健康度", value: sugLevel, color: sugLevel >= 70 ? "text-emerald-600" : "text-amber-600" },
    { label: "项目改写", value: projPct, color: projPct >= 60 ? "text-emerald-600" : "text-amber-600" },
    { label: "面试准备", value: intPct, color: intPct >= 60 ? "text-emerald-600" : "text-amber-600" }
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
      {dims.map((d) => (
        <div key={d.label} className="rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4 text-center">
          <p className={`text-2xl font-bold ${d.color}`}>{d.value}%</p>
          <p className="mt-1 text-xs font-medium text-zinc-400">{d.label}</p>
        </div>
      ))}
    </div>
  );
}

function CollapsibleSection({
  title,
  subtitle,
  defaultOpen = true,
  actions,
  children
}: {
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  actions?: React.ReactNode;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section className="rounded-[2rem] border border-zinc-800 glass-panel p-6 backdrop-blur-sm">
      <div className="flex items-start justify-between gap-4">
        <button type="button" onClick={() => setOpen((value) => !value)} className="text-left">
          <div className="flex items-center gap-3">
            <span className="text-xl font-bold text-white">{title}</span>
            <span className={`inline-flex h-5 w-5 items-center justify-center rounded-full text-xs text-zinc-400 transition-transform ${open ? "rotate-90" : ""}`}>
              ▸
            </span>
          </div>
          {subtitle ? <p className="mt-2 text-sm text-zinc-400">{subtitle}</p> : null}
        </button>
        {actions ? <div className="flex flex-wrap items-center justify-end gap-2">{actions}</div> : null}
      </div>
      {open ? <div className="collapsible-content mt-5">{children}</div> : null}
    </section>
  );
}

function getSuggestionPriority(index: number, score: number | null, missingKeywordsCount: number) {
  if (score !== null && score < 60 && index < 2) {
    return { label: "立即处理", className: "bg-red-100 text-red-700" };
  }
  if (missingKeywordsCount >= 5 && index < 3) {
    return { label: "高影响", className: "bg-amber-100 text-amber-700" };
  }
  if (index === 0) return { label: "高影响", className: "bg-red-100 text-red-700" };
  if (index <= 2) return { label: "中影响", className: "bg-amber-100 text-amber-700" };
  return { label: "低影响", className: "bg-zinc-800 text-zinc-300" };
}

export function ResultInteractions(props: ResultInteractionsProps) {
  const toast = useToast();
  const markdown = useMemo(() => buildMarkdownReport(props), [props]);
  const emailSummary = useMemo(() => buildEmailSummary(props), [props]);
  const priorityItems = useMemo(
    () => getScorePriorityItems(props.score, props.analysis),
    [props.analysis, props.score]
  );

  function exportMarkdown() {
    const blob = new Blob([markdown], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${(props.fileName || "resume-analysis").replace(/\.[^.]+$/, "")}-analysis.md`;
    anchor.click();
    URL.revokeObjectURL(url);
    toast({ tone: "success", title: "Markdown 已导出" });
  }

  function exportPdf() {
    toast({ tone: "info", title: "即将打开打印面板", description: "你可以在浏览器里保存为 PDF。" });
    window.print();
  }

  const matchedKeywords = props.analysis.matchedKeywords.map((keyword, index) => ({
    keyword,
    size: index < 3 ? "lg" : index < 8 ? "md" : "sm"
  })) as { keyword: string; size: "lg" | "md" | "sm" }[];

  const missingKeywords = props.analysis.missingKeywords.map((keyword, index) => ({
    keyword,
    size: index < 3 ? "lg" : index < 8 ? "md" : "sm"
  })) as { keyword: string; size: "lg" | "md" | "sm" }[];

  return (
    <div className="space-y-6">
      {/* Dimension score cards */}
      <DimensionScoreCards analysis={props.analysis} />

      {/* Action center */}
      <section className="animate-slide-up rounded-[2rem] border border-zinc-800 glass-panel p-6 backdrop-blur-sm">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-400">Action Center</p>
            <h2 className="mt-2 text-2xl font-bold text-white">下一步怎么改，先后顺序已经排好</h2>
            <p className="mt-2 text-sm leading-6 text-zinc-400">
              建议先处理高影响项，再回到编辑器重新分析。这样能更快逼近目标岗位要求。
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {props.analysisId ? (
              <>
                <Link
                  href={`/tasks`}
                  className="btn-secondary rounded-full px-4 py-2 text-xs font-semibold text-zinc-300"
                >
                  返回任务列表
                </Link>
                <Link
                  href="/upload"
                  className="btn-secondary rounded-full px-4 py-2 text-xs font-semibold text-zinc-300"
                >
                  新建分析
                </Link>
              </>
            ) : null}
            <CopyButton text={markdown} label="复制完整报告" />
            <CopyButton text={emailSummary} label="复制求职邮件摘要" />
            <button
              type="button"
              onClick={exportMarkdown}
              className="btn-secondary rounded-full px-4 py-2 text-xs font-semibold text-zinc-300"
            >
              导出 Markdown
            </button>
            <button
              type="button"
              onClick={exportPdf}
              className="btn-primary rounded-full px-4 py-2 text-xs font-semibold text-white"
            >
              导出 PDF
            </button>
          </div>
        </div>

        <div className="mt-6 grid gap-4 lg:grid-cols-3">
          {priorityItems.map((item, index) => (
            <article key={item.title} className={`accent-stripe rounded-[1.5rem] border p-4 ${item.toneClass}`}>
              <p className="text-xs font-semibold uppercase tracking-[0.2em] opacity-60">Step {index + 1}</p>
              <h3 className="mt-2 text-base font-bold">{item.title}</h3>
              <p className="mt-2 text-sm leading-6 opacity-85">{item.description}</p>
            </article>
          ))}
        </div>
      </section>

      {/* Keywords */}
      <CollapsibleSection
        title="关键词匹配"
        subtitle="命中词和缺失词按重要度分层展示，可直接搜索或注入到简历编辑区。"
        actions={
          <>
            <CopyButton text={props.analysis.matchedKeywords.join("\n")} label="复制命中词" />
            <CopyButton text={props.analysis.missingKeywords.join("\n")} label="复制缺失词" />
          </>
        }
      >
        <KeywordCoverageBar matched={props.analysis.matchedKeywords.length} missing={props.analysis.missingKeywords.length} />
        <div className="grid gap-6 md:grid-cols-2">
          <div>
            <p className="text-sm font-bold text-zinc-300">已命中</p>
            {matchedKeywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {matchedKeywords.map((item) => (
                  <KeywordChip
                    key={item.keyword}
                    keyword={item.keyword}
                    tone="matched"
                    size={item.size}
                    onSearch={props.onSearchKeyword}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">暂未提取到明确的命中关键词。</p>
            )}
          </div>
          <div>
            <p className="text-sm font-bold text-zinc-300">待补充</p>
            {missingKeywords.length > 0 ? (
              <div className="mt-3 flex flex-wrap gap-2">
                {missingKeywords.map((item) => (
                  <KeywordChip
                    key={item.keyword}
                    keyword={item.keyword}
                    tone="missing"
                    size={item.size}
                    onSearch={props.onSearchKeyword}
                    onInject={props.onInjectKeyword}
                  />
                ))}
              </div>
            ) : (
              <p className="mt-3 text-sm text-zinc-400">暂未发现明显缺失项。</p>
            )}
          </div>
        </div>
      </CollapsibleSection>

      {/* Suggestions */}
      <CollapsibleSection
        title="优化建议"
        subtitle="建议已按影响程度排序，按影响分组展示。"
        actions={<CopyButton text={props.analysis.suggestions.join("\n")} label="复制建议" />}
      >
        {props.analysis.suggestions.length > 0 ? (
          <div className="space-y-4">
            {["立即处理", "高影响", "中影响", "低影响"].map((groupLabel) => {
              const groupItems = props.analysis.suggestions
                .map((item, index) => ({ item, index, priority: getSuggestionPriority(index, props.score, props.analysis.missingKeywords.length) }))
                .filter((entry) => entry.priority.label === groupLabel);
              if (groupItems.length === 0) return null;
              return (
                <div key={groupLabel}>
                  <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-zinc-400">{groupLabel}</p>
                  <ul className="space-y-2">
                    {groupItems.map(({ item, index, priority }) => (
                      <li key={item} className="card-hover rounded-2xl border border-zinc-800 bg-zinc-900/30 px-4 py-3 text-sm leading-7 text-zinc-300">
                        <div className="mb-2 flex items-center gap-2">
                          <span className="inline-flex rounded-full bg-gradient-to-r from-stone-800 to-stone-900 px-2.5 py-0.5 text-xs font-semibold text-white">
                            建议 {index + 1}
                          </span>
                          <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${priority.className}`}>
                            {priority.label}
                          </span>
                        </div>
                        {item}
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">当前没有生成额外建议。</p>
        )}
      </CollapsibleSection>

      {/* Rewritten summary */}
      <CollapsibleSection
        title="改写后的个人总结"
        subtitle="这部分可以直接替换到简历开头的个人简介。"
        actions={<CopyButton text={props.analysis.rewrittenSummary} label="复制总结" />}
      >
        <p className="whitespace-pre-wrap text-sm leading-7 text-zinc-300">
          {props.analysis.rewrittenSummary || "当前没有生成总结改写。"}
        </p>
      </CollapsibleSection>

      {/* Rewritten projects */}
      <CollapsibleSection
        title="项目改写建议"
        subtitle="左右分栏对照展示，便于直接改写已有项目描述。"
        defaultOpen={false}
        actions={
          <CopyButton
            text={props.analysis.rewrittenProjects
              .map((item, index) => `${item.title || `项目 ${index + 1}`}\nBefore:\n${item.before}\n\nAfter:\n${item.after}`)
              .join("\n\n")}
            label="复制项目改写"
          />
        }
      >
        {props.analysis.rewrittenProjects.length > 0 ? (
          <div className="space-y-4">
            {props.analysis.rewrittenProjects.map((item, index) => (
              <article key={`${item.title}-${index}`} className="rounded-3xl border border-zinc-800 bg-zinc-900/30 p-5">
                <h3 className="text-base font-bold text-white">{item.title || `项目 ${index + 1}`}</h3>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-2xl glass-panel p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">Before</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{item.before || "暂无"}</p>
                  </div>
                  <div className="rounded-2xl glass-panel p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.22em] text-zinc-400">After</p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{item.after || "暂无"}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">当前没有生成项目改写内容。</p>
        )}
      </CollapsibleSection>

      {/* Interview Q&A */}
      <CollapsibleSection
        title="面试问答准备"
        subtitle="按问题逐条展开，便于节省页面空间。"
        defaultOpen={false}
        actions={
          <CopyButton
            text={props.analysis.interviewQuestions.map((item, index) => `${index + 1}. ${item.question}\n${item.answer}`).join("\n\n")}
            label="复制问答"
          />
        }
      >
        {props.analysis.interviewQuestions.length > 0 ? (
          <div className="space-y-3">
            {props.analysis.interviewQuestions.map((item, index) => {
              const diff = index < 2 ? "基础" : index < 4 ? "进阶" : "高级";
              const diffColor = diff === "基础" ? "border-emerald-200/60 bg-emerald-50/70 text-emerald-700" : diff === "进阶" ? "border-amber-200/60 bg-amber-50/70 text-amber-700" : "border-red-200/60 bg-red-50/70 text-red-700";
              return (
                <details key={`${item.question}-${index}`} className="group rounded-2xl border border-zinc-800 bg-zinc-900/30 px-5 py-4">
                  <summary className="cursor-pointer list-none">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-white transition group-open:text-zinc-300">{item.question}</span>
                      <span className={`shrink-0 rounded-full border px-2 py-0.5 text-[10px] font-semibold ${diffColor}`}>{diff}</span>
                    </div>
                  </summary>
                  <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-zinc-300">{item.answer}</p>
                </details>
              );
            })}
          </div>
        ) : (
          <p className="text-sm text-zinc-400">当前没有生成面试问答。</p>
        )}
      </CollapsibleSection>
    </div>
  );
}
