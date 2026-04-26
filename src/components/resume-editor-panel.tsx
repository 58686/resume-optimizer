"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

type EditorAction = {
  term: string;
  mode: "search" | "inject";
  nonce: number;
} | null;

export function ResumeEditorPanel({
  analysisId,
  initialResumeText,
  initialJobDescription,
  pendingAction
}: {
  analysisId: string;
  initialResumeText: string;
  initialJobDescription: string;
  pendingAction: EditorAction;
}) {
  const router = useRouter();
  const toast = useToast();
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const [resumeText, setResumeText] = useState(initialResumeText);
  const [jobDescription, setJobDescription] = useState(initialJobDescription);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!pendingAction || !textAreaRef.current) {
      return;
    }

    const textarea = textAreaRef.current;
    textarea.focus();

    if (pendingAction.mode === "search") {
      const index = resumeText.toLowerCase().indexOf(pendingAction.term.toLowerCase());
      if (index >= 0) {
        textarea.setSelectionRange(index, index + pendingAction.term.length);
      } else {
        toast({
          tone: "info",
          title: "未找到关键词",
          description: `简历正文里暂未找到“${pendingAction.term}”。`
        });
      }
      return;
    }

    const start = textarea.selectionStart ?? resumeText.length;
    const end = textarea.selectionEnd ?? resumeText.length;
    const insertion = `${pendingAction.term} `;
    const nextText = `${resumeText.slice(0, start)}${insertion}${resumeText.slice(end)}`;
    setResumeText(nextText);

    requestAnimationFrame(() => {
      const nextPosition = start + insertion.length;
      textarea.focus();
      textarea.setSelectionRange(nextPosition, nextPosition);
    });
  }, [pendingAction, resumeText, toast]);

  async function handleReanalyze() {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/result/${analysisId}/reanalyze`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          resumeText,
          jobDescription
        })
      });
      const data = await readApiResponse<{ taskId: string }>(response);
      toast({
        tone: "success",
        title: "已提交重新分析",
        description: "正在跳转到任务详情页。"
      });
      router.push(`/tasks/${data.taskId}`);
      router.refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "重新分析失败",
        description: error instanceof Error ? error.message : "提交任务失败。"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[2rem] border border-zinc-800 glass-panel p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Editor</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">简历对照编辑器</h2>
          <p className="mt-2 text-sm text-zinc-400">边看建议边修改原始简历，修改后可直接重新分析。</p>
        </div>
        <button
          type="button"
          onClick={() => void handleReanalyze()}
          disabled={isSubmitting}
          className="rounded-full btn-primary px-5 py-2.5 text-sm font-medium text-white transition hover:border-transparent disabled:bg-stone-400"
        >
          {isSubmitting ? "提交中..." : "重新分析这版简历"}
        </button>
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">简历正文</label>
          <textarea
            ref={textAreaRef}
            value={resumeText}
            onChange={(event) => setResumeText(event.target.value)}
            className="min-h-[420px] w-full rounded-[1.5rem] border border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm leading-6 text-zinc-300 outline-none transition focus:border-zinc-500"
          />
        </div>
        <div>
          <label className="mb-2 block text-sm font-medium text-zinc-300">目标职位描述</label>
          <textarea
            value={jobDescription}
            onChange={(event) => setJobDescription(event.target.value)}
            className="min-h-[420px] w-full rounded-[1.5rem] border border-zinc-700 bg-zinc-900/50 px-4 py-4 text-sm leading-6 text-zinc-300 outline-none transition focus:border-zinc-500"
          />
        </div>
      </div>
    </section>
  );
}
