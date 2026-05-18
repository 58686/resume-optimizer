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
  if (score === null) return "border border-stone-200 bg-stone-100 text-stone-600";
  if (score >= 80) return "border border-emerald-300 bg-emerald-50 text-emerald-700";
  if (score >= 60) return "border border-amber-300 bg-amber-50 text-amber-700";
  return "border border-red-300 bg-red-50 text-red-700";
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
          ? "border border-amber-200 bg-amber-50 text-amber-800 hover:bg-amber-100"
          : "border border-stone-200 bg-stone-50 text-stone-700 hover:bg-stone-100"
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
        <div className="animate-scale-in rounded-2xl border border-red-200 bg-red-50 px-3 py-2 text-right text-xs text-red-700">
          <p>确认删除&ldquo;{label}&rdquo;？</p>
          <div className="mt-2 flex justify-end gap-2">
            <button type="button" onClick={() => setIsConfirming(false)} className="rounded-full border border-stone-200 bg-white px-3 py-1 text-stone-700 hover:bg-stone-50">
              取消
            </button>
            <button type="button" onClick={() => void handleDelete()} disabled={isDeleting} className="rounded-full border border-red-300 px-3 py-1 text-red-700 transition hover:bg-red-100">
              {isDeleting ? "删除中..." : "确认删除"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setIsConfirming(true)}
          className="rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-100"
        >
          删除
        </button>
      )}
      {error ? <p className="text-xs text-red-600">{error}</p> : null}
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
      <form className="animate-slide-up delay-1 rounded-[2rem] border border-[rgba(118,82,58,0.14)] bg-white/80 p-5 shadow-[0_18px_42px_rgba(118,82,58,0.10)] backdrop-blur-sm">
        <div className="grid gap-4 md:grid-cols-[1fr_180px_auto] md:items-end">
          <div>
            <label htmlFor="search" className="block text-sm font-bold text-[var(--text-primary)]">
              搜索
            </label>
            <input
              id="search"
              name="search"
              defaultValue={search}
              placeholder="搜索文件名或职位描述关键词"
              className="mt-2 block w-full rounded-2xl border border-[rgba(118,82,58,0.16)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none placeholder:text-[var(--text-muted)] focus:border-[var(--brand-gradient-mid)] focus:ring-4 focus:ring-orange-100"
            />
          </div>
          <div>
            <label htmlFor="sort" className="block text-sm font-bold text-[var(--text-primary)]">
              排序
            </label>
            <select
              id="sort"
              name="sort"
              defaultValue={sort}
              className="mt-2 block w-full rounded-2xl border border-[rgba(118,82,58,0.16)] bg-white px-4 py-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--brand-gradient-mid)] focus:ring-4 focus:ring-orange-100"
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
              <Link href="/history" className="rounded-full border border-stone-200 bg-white px-5 py-3 text-sm font-semibold text-stone-700 transition hover:bg-stone-50">
                清空
              </Link>
            ) : null}
            <button
              type="button"
              onClick={() => { setCompareMode((v) => !v); setSelectedIds([]); }}
              className={`rounded-full px-5 py-3 text-sm font-semibold transition ${compareMode ? "btn-primary text-white" : "border border-stone-200 bg-white text-stone-700 hover:bg-stone-50"}`}
            >
              {compareMode ? "退出对比" : "版本对比"}
            </button>
          </div>
        </div>
      </form>

      {/* Compare action bar */}
      {compareMode && (
        <div className="animate-slide-up flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50 px-5 py-3 shadow-sm">
          <p className="text-sm font-medium text-amber-900">
            已选 <span className="font-bold text-amber-700">{selectedIds.length}</span> / 2 条记录
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
                      isSelected ? "border-[var(--brand-gradient-mid)] bg-[var(--brand-gradient-mid)] text-white" : "border-stone-300 bg-white"
                    }`}>
                      {isSelected ? "✓" : ""}
                    </span>
                  )}
                  <div className={`rounded-full px-3.5 py-1.5 text-sm font-bold ${getScoreBadgeClass(item.score)}`}>
                    {item.score ?? "--"}
                  </div>
                  {item.starred ? (
                    <span className="rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold text-amber-800">已标星</span>
                  ) : null}
                </div>
                <p className="mt-3 text-lg font-bold text-[var(--text-primary)]">{item.fileName || "未命名文件"}</p>
                <p className="mt-2 line-clamp-2 text-sm font-medium leading-6 text-[var(--text-secondary)]">{item.jobDescription}</p>
                <p className="mt-3 text-xs font-semibold text-[var(--text-muted)]">{new Date(item.createdAt).toLocaleString("zh-CN")}</p>
              </>
            );
            return (
              <article
                key={item.id}
                className={`accent-stripe card-hover animate-slide-up delay-${Math.min(index + 2, 6)} rounded-[2rem] border bg-white/85 p-6 shadow-[0_16px_38px_rgba(118,82,58,0.10)] backdrop-blur-sm transition ${
                  compareMode && isSelected ? "border-[var(--brand-gradient-mid)] shadow-[0_0_0_1px_var(--brand-gradient-mid),0_18px_42px_rgba(217,141,104,0.18)]" : "border-[rgba(118,82,58,0.16)]"
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
        <section className="animate-slide-up delay-2 rounded-[2rem] border border-dashed border-[rgba(118,82,58,0.22)] bg-white/75 p-8 text-center backdrop-blur-sm">
          <p className="text-lg font-semibold text-[var(--text-primary)]">{emptyMessage}</p>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
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
