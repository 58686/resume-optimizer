import type { Prisma } from "@prisma/client";
import { HistoryList } from "@/components/history-list";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

type HistoryPageProps = {
  searchParams?: Promise<{ search?: string; sort?: string }>;
};

function normalizeSort(sort?: string): "latest" | "score" | "starred" {
  if (sort === "score") return "score";
  if (sort === "starred") return "starred";
  return "latest";
}

export default async function HistoryPage({ searchParams }: HistoryPageProps) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const search = params.search?.trim() || "";
  const sort = normalizeSort(params.sort);

  const where: Prisma.ResumeAnalysisWhereInput = {
    userId: user.id,
    ...(search ? { OR: [{ fileName: { contains: search } }, { jobDescription: { contains: search } }] } : {})
  };

  const orderBy: Prisma.ResumeAnalysisOrderByWithRelationInput[] =
    sort === "score"
      ? [{ score: "desc" }, { createdAt: "desc" }]
      : sort === "starred"
        ? [{ starred: "desc" }, { createdAt: "desc" }]
        : [{ createdAt: "desc" }];

  const items = await prisma.resumeAnalysis.findMany({
    where,
    orderBy,
    take: 50,
    select: {
      id: true,
      createdAt: true,
      fileName: true,
      score: true,
      jobDescription: true,
      starred: true
    }
  });

  return (
    <main className="min-h-screen px-6 py-12 text-[var(--text-primary)]">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="animate-slide-up">
          <p className="text-xs font-semibold uppercase tracking-[0.35em] text-[var(--text-muted)]">History</p>
          <h1 className="mt-2 text-4xl font-extrabold text-[var(--text-primary)]">
            历史<span className="text-brand-gradient">分析记录</span>
          </h1>
          <p className="mt-3 text-sm font-medium text-[var(--text-secondary)]">展示当前账号下最近 50 条结果，支持搜索、排序和标星。</p>
        </div>
        <HistoryList
          items={items.map((item) => ({ ...item, createdAt: item.createdAt.toISOString() }))}
          search={search}
          sort={sort}
        />
      </section>
    </main>
  );
}
