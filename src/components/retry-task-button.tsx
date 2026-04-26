"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiResponse } from "@/lib/api-client";

type RetryTaskButtonProps = {
  taskId: string;
  className?: string;
  label?: string;
};

export function RetryTaskButton({
  taskId,
  className = "rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white",
  label = "重试任务"
}: RetryTaskButtonProps) {
  const router = useRouter();
  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState("");

  async function handleRetry() {
    if (isRetrying) return;

    try {
      setIsRetrying(true);
      setError("");
      const response = await fetch(`/api/tasks/${taskId}`, { method: "POST" });
      const data = await readApiResponse<{ taskId: string; status: string }>(response);
      router.push(`/tasks/${data.taskId}`);
      router.refresh();
    } catch (retryError) {
      setError(retryError instanceof Error ? retryError.message : "重试任务失败。");
    } finally {
      setIsRetrying(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button type="button" onClick={handleRetry} disabled={isRetrying} className={className}>
        {isRetrying ? "重试中..." : label}
      </button>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
