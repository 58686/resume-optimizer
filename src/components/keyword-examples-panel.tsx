"use client";

import { useState } from "react";
import { useToast } from "@/components/toast-provider";
import { readApiResponse } from "@/lib/api-client";

type KeywordExample = { keyword: string; example: string };

type Props = {
  analysisId: string;
  missingKeywords: string[];
  providerConfigs: { id: string; name: string }[];
};

export function KeywordExamplesPanel({ analysisId, missingKeywords, providerConfigs }: Props) {
  const toast = useToast();
  const [providerConfigId, setProviderConfigId] = useState(providerConfigs[0]?.id ?? "");
  const [isGenerating, setIsGenerating] = useState(false);
  const [examples, setExamples] = useState<KeywordExample[]>([]);
  const [copied, setCopied] = useState<string | null>(null);

  if (missingKeywords.length === 0) return null;

  async function handleGenerate() {
    if (!providerConfigId) {
      toast({ tone: "error", title: "请选择 AI 配置" });
      return;
    }
    try {
      setIsGenerating(true);
      setExamples([]);
      const response = await fetch(`/api/result/${analysisId}/keyword-examples`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ providerConfigId })
      });
      const data = await readApiResponse<{ examples: KeywordExample[] }>(response);
      setExamples(data.examples);
      toast({ tone: "success", title: "改写示例已生成", description: `共 ${data.examples.length} 个关键词示例。` });
    } catch (error) {
      toast({ tone: "error", title: "生成失败", description: error instanceof Error ? error.message : "请稍后再试。" });
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy(text: string) {
    await navigator.clipboard.writeText(text);
    setCopied(text);
    setTimeout(() => setCopied(null), 1800);
  }

  return (
    <section className="rounded-[2rem] border border-zinc-800 glass-panel p-6 backdrop-blur-sm">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Keyword Examples</p>
          <h2 className="mt-1.5 text-xl font-bold text-white">缺失关键词改写示例</h2>
          <p className="mt-1.5 text-sm text-zinc-400">
            AI 为每个缺失关键词生成一句可直接套用的简历描述，点击复制后粘贴到对应经历中。
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {providerConfigs.length > 1 && (
            <select
              value={providerConfigId}
              onChange={(e) => setProviderConfigId(e.target.value)}
              className="rounded-xl border border-zinc-700 bg-zinc-900/50 px-3 py-2 text-sm text-zinc-300 outline-none transition focus:border-zinc-500 input-glow"
            >
              {providerConfigs.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => void handleGenerate()}
            disabled={isGenerating}
            className="btn-primary rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
          >
            {isGenerating ? (
              <span className="flex items-center gap-2">
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                生成中...
              </span>
            ) : examples.length > 0 ? "重新生成" : "生成改写示例 →"}
          </button>
        </div>
      </div>

      {/* Missing keywords preview */}
      {examples.length === 0 && !isGenerating && (
        <div className="mt-5 flex flex-wrap gap-2">
          {missingKeywords.map((kw) => (
            <span key={kw} className="rounded-full border border-amber-200/60 bg-amber-50/70 px-3 py-1 text-xs font-semibold text-amber-700">
              {kw}
            </span>
          ))}
        </div>
      )}

      {/* Generated examples */}
      {examples.length > 0 && (
        <div className="mt-5 space-y-3">
          {examples.map((item) => (
            <div
              key={item.keyword}
              className="flex items-start gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4"
            >
              <span className="mt-0.5 shrink-0 rounded-full border border-amber-200/60 bg-amber-50/70 px-2.5 py-0.5 text-xs font-bold text-amber-700">
                {item.keyword}
              </span>
              <p className="flex-1 text-sm leading-6 text-zinc-300">{item.example}</p>
              <button
                type="button"
                onClick={() => void handleCopy(item.example)}
                className="shrink-0 rounded-lg border border-zinc-700 bg-zinc-900/50 px-2.5 py-1 text-xs font-medium text-zinc-400 transition hover:border-zinc-500 hover:text-zinc-200"
              >
                {copied === item.example ? "✓ 已复制" : "复制"}
              </button>
            </div>
          ))}
        </div>
      )}

      {isGenerating && (
        <div className="mt-5 space-y-3">
          {missingKeywords.slice(0, 4).map((kw) => (
            <div key={kw} className="flex items-center gap-4 rounded-2xl border border-zinc-800 bg-zinc-900/30 p-4">
              <span className="shrink-0 rounded-full border border-amber-200/60 bg-amber-50/70 px-2.5 py-0.5 text-xs font-bold text-amber-700">{kw}</span>
              <div className="h-4 flex-1 animate-shimmer rounded-full" />
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
