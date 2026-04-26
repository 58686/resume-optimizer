"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { readApiResponse } from "@/lib/api-client";

type DeleteTaskButtonProps = {
  taskId: string;
  className?: string;
  label?: string;
  redirectTo?: string;
};

export function DeleteTaskButton({
  taskId,
  className = "rounded-full border border-red-200 px-4 py-2 text-sm font-medium text-red-700 transition hover:border-red-300 hover:text-red-800",
  label = "删除任务",
  redirectTo
}: DeleteTaskButtonProps) {
  const router = useRouter();
  const [isConfirming, setIsConfirming] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (isDeleting) return;

    if (!isConfirming) {
      setIsConfirming(true);
      setError("");
      return;
    }

    try {
      setIsDeleting(true);
      setError("");
      await readApiResponse<{ taskId: string; deleted: boolean }>(
        await fetch(`/api/tasks/${taskId}`, { method: "DELETE" })
      );

      if (redirectTo) {
        router.push(redirectTo);
      }

      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除任务失败。");
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={handleDelete} disabled={isDeleting} className={className}>
          {isDeleting ? "删除中..." : isConfirming ? "确认删除" : label}
        </button>
        {isConfirming ? (
          <button
            type="button"
            onClick={() => {
              if (isDeleting) return;
              setIsConfirming(false);
              setError("");
            }}
            className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
          >
            取消
          </button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
    </div>
  );
}
