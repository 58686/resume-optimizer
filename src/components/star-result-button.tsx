"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { readApiResponse } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";

export function StarResultButton({
  resultId,
  initialStarred
}: {
  resultId: string;
  initialStarred: boolean;
}) {
  const router = useRouter();
  const toast = useToast();
  const [starred, setStarred] = useState(initialStarred);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function toggleStar() {
    try {
      setIsSubmitting(true);
      const nextValue = !starred;
      const response = await fetch(`/api/result/${resultId}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ starred: nextValue })
      });
      await readApiResponse<{ starred: boolean }>(response);
      setStarred(nextValue);
      toast({
        tone: "success",
        title: nextValue ? "已标星" : "已取消标星"
      });
      router.refresh();
    } catch (error) {
      toast({
        tone: "error",
        title: "操作失败",
        description: error instanceof Error ? error.message : "标星保存失败。"
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      disabled={isSubmitting}
      onClick={() => void toggleStar()}
      className={`rounded-full px-4 py-2 text-sm font-medium transition ${
        starred
          ? "border border-amber-200 bg-amber-50 text-amber-700"
          : "border border-zinc-700 bg-zinc-900/50 text-zinc-300 hover:border-zinc-600"
      }`}
    >
      {starred ? "★ 已标星" : "☆ 标星结果"}
    </button>
  );
}
