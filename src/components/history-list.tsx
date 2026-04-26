"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { readApiResponse } from "@/lib/api-client";
import { useToast } from "@/components/toast-provider";


type HistoryItem = {
  id: string;
  createdAt: string;
  fileName: string | null;
  score: number | null;
  jobDescription: string;
  starred: boolean;
};

type HistoryListProps = {
  items: HistoryItem[];
  search: string;
  sort: "latest" | "score" | "starred";
};

function getScoreBadgeClass(score: number | null) {
  if (score === null) return "bg-zinc-800 text-zinc-300";
  if (score >= 80) return "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400";
  if (score >= 60) return "bg-amber-500/20 border border-amber-500/30 text-amber-400";
  return "bg-red-500/20 border border-red-500/30 text-red-400";
}

function StarButton({ id, initialStarred }: { id: string; initialStarred: boolean }) {
  const router = useRouter();
  const [starred, setStarred] = useState(initialStarred);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleToggle() {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/result/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ starred: !starred })
      });
      await readApiResponse<{ starred: boolean }>(response);
      setStarred((value) => !value);
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <button
      type="button"
      onClick={() => void handleToggle()}
      disabled={isSubmitting}
      className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
        starred
          ? "bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
          : "btn-secondary text-zinc-300"
      }`}
    >
      {starred ? "★ 已标星" : "☆ 标星"}
    </button>
  );
}

function DeleteButton({ id, label }: { id: string; label: string }) {
  const router = useRouter();
  const [isDeleting, setIsDeleting] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    try {
      setIsDeleting(true);
      setError("");
      const response = await fetch(`/api/result/${id}`, { method: "DELETE" });
      await readApiResponse<{ deleted: true }>(response);
      router.refresh();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "删除失败。");
    } finally {
      setIsDeleting(false);
      setIsConfirming(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {isConfirming ? (
        <div className="animate-scale-in rounded-2xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-right text-xs text-red-400">
          <p>确认删除&ldquo;{label}&rdquo;？</p>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setIsConfirming(false)} className="btn-secondary rounded-full px-3 py-1 text-zinc-300">
              取消
            </button>
            <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="rounded-full border border-red-500/50 px-3 py-1 text-red-400 transition hover:bg-red-500/20">
              {isDeleting ? "删除中..." : "确认删除"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="rounded-full border border-red-500/30 px-3 py-1.5 text-xs font-medium text-red-400 transition hover:border-red-500/50 hover:bg-red-500/10 hover:text-red-400"
        >
          删除
        </button>
      )}
      {error ? <p className="text-xs text-red-400">{error}</p> : null}
    </div>
  );
}

export function HistoryList({ items, search, sort }: HistoryListProps) {
  const router = useRouter();
  const toast = useToast();
  const hasFilters = Boolean(search) || sort !== "latest";
  const emptyMessage = useMemo(
    () => (hasFilters ? "没有符合当前筛选条件的结果。" : "还没有历史分析结果。"),
    [hasFilters]
  );
  const [compareMode, setCompareMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  function toggleSelect(id: string) {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : prev.length < 2 ? [...prev, id] : prev
    );
  }

  function handleStartCompare() {
    if (selectedIds.length !== 2) {
      toast({ tone: "error", title: "请选择两条记录进行对比" });
      return;
    }
    router.push(`/compare?a=${selectedIds[0]}&b=${selectedIds[1]}`);
  }

  return (
    <>
      {/* Search & filter bar */}
      <form className="animate-slide-up delay-1 rounded-[2rem] border border-zinc-800 bg-zinc-900/50 p-5 backdrop-blur-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
          <div>
            <label htmlFor="search" className="block text-sm font-semibold text-zinc-300">
              搜索
            </label>
            <input
              id="search"
              name="search"
              defaultValue={search}
              placeholder="搜索文件名或职位描述关键词"
              className="input-glow mt-2 block w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300 placeholder:text-zinc-400"
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-semibold text-zinc-300">
              排序
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="input-glow mt-2 block w-full rounded-2xl border border-zinc-800 bg-zinc-900/50 px-4 py-3 text-sm text-zinc-300"
            >
              <option value="latest">按最新时间</option>
              <option value="score">按匹配分</option>
              <option value="starred">优先标星</option>
            </select>
          </div>
          <div className="flex gap-3">
            <button type="submit" className="btn-primary rounded-full px-5 py-3 text-sm font-semibold text-white">
              应用
            </button>
            {hasFilters ? (
              <Link href="/history" className="btn-secondary rounded-full px-5 py-3 text-sm font-semibold text-zinc-300">
                清空
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => { setCompareMode((v) => !v); setSelectedIds([]); }}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${compareMode ? "btn-primary text-white" : "btn-secondary text-zinc-300"}`}
            >
              {compareMode ? "退出对比" : "版本对比"}
            </button>
          </div>
        </div>
      </form>

      {/* Compare action bar */}
      {compareMode && (
        <div className="animate-slide-up flex items-center justify-between rounded-2xl border border-zinc-700 bg-zinc-900/50 px-5 py-3">
          <p className="text-sm text-zinc-400">
            已选 <span className="font-bold text-white">{selectedIds.length}</span> / 2 条记录
          </p>
          <button
            type="button"
            onClick={handleStartCompare}
            disabled={selectedIds.length !== 2}
            className="btn-primary rounded-full px-5 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            开始对比 →
          </button>
        </div>
      )}

      {/* Results list */}
      {items.length > 0 ? (
        <div className="space-y-4">
          {items.map((item, index) => {
            const isSelected = selectedIds.includes(item.id);
            const cardContent = (
              <>
                <div className="flex items-center gap-3">
                  {compareMode && (
                    <span className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border-2 text-xs font-bold transition ${
                      isSelected ? "border-[var(--brand-accent)] bg-[var(--brand-accent)] text-white" : "border-zinc-600"
                    }`}>
                      {isSelected ? "✓" : ""}
                    </span>
                  )}
                  <div className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${getScoreBadgeClass(item.score)}`}>
                    {item.score ?? "--"}
                  </div>
                  {item.starred ? (
                    <span className="rounded-full bg-amber-500/10 px-3 py-1 text-xs font-semibold text-amber-400">已标星</span>
                  ) : null}
                </div>
                <p className="mt-3 text-lg font-bold text-white">{item.fileName || "未命名文件"}</p>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-zinc-400">{item.jobDescription}</p>
                <p className="mt-3 text-xs text-zinc-400">{new Date(item.createdAt).toLocaleString("zh-CN")}</p>
              </>
            );
            return (
              <article
                key={item.id}
                className={`accent-stripe card-hover animate-slide-up delay-${Math.min(index + 2, 6)} rounded-[2rem] border bg-zinc-900/50 p-6 backdrop-blur-sm transition ${
                  compareMode && isSelected ? "border-[var(--brand-accent)] shadow-[0_0_0_1px_var(--brand-accent)]" : "border-zinc-800"
                }`}
              >
                <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                  {compareMode ? (
                    <button
                      type="button"
                      onClick={() => toggleSelect(item.id)}
                      className="min-w-0 flex-1 text-left"
                    >
                      {cardContent}
                    </button>
                  ) : (
                    <Link href={`/result/${item.id}`} className="min-w-0 flex-1">
                      {cardContent}
                    </Link>
                  )}
                  {!compareMode && (
                    <div className="flex items-center gap-2">
                      <StarButton id={item.id} initialStarred={item.starred} />
                      <DeleteButton id={item.id} label={item.fileName || "未命名文件"} />
                    </div>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <section className="animate-slide-up delay-2 rounded-[2rem] border border-dashed border-zinc-700/60 bg-zinc-900/50 p-8 text-center backdrop-blur-sm">
          <p className="text-lg font-semibold text-zinc-300">{emptyMessage}</p>
          <p className="mt-2 text-sm text-zinc-400">
            {hasFilters ? "可以调整搜索词或排序方式后再试。" : "完成第一次分析后，结果会自动显示在这里。"}
          </p>
          {!hasFilters ? (
            <Link href="/upload" className="btn-primary mt-5 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold text-white">
              去上传简历
            </Link>
          ) : null}
        </section>
      )}
    </>
  );
}
