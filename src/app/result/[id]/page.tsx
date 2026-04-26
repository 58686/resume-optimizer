import Link from "next/link";
import { notFound } from "next/navigation";
import { KeywordExamplesPanel } from "@/components/keyword-examples-panel";
import { ResultWorkspace } from "@/components/result-workspace";
import { ScoreRing } from "@/components/score-ring";
import { StarResultButton } from "@/components/star-result-button";
import { analysisInclude, mapAnalysisRecord } from "@/lib/analysis-record";
import { requireCurrentUser } from "@/lib/auth";
import { listUserProviderConfigs } from "@/lib/provider-configs";
import { prisma } from "@/lib/prisma";

function getScoreSummary(score: number | null) {
  if (score === null) return "本次分析没有返回有效分数。";
  if (score >= 80) return "当前简历与目标岗位高度匹配，建议重点打磨措辞和项目表达。";
  if (score >= 60) return "当前已经具备竞争力，但仍有关键词覆盖和表达层面的提升空间。";
  return "当前匹配度偏低，建议优先补齐缺失关键词和项目成果表达。";
}

function getFocusLabel(score: number | null) {
  if (score === null) return "先检查结果";
  if (score >= 80) return "准备投递版本";
  if (score >= 60) return "补强关键词覆盖";
  return "先补缺失关键词";
}

export default async function ResultPage({
  params
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await requireCurrentUser();
  const { id } = await params;
  const row = await prisma.resumeAnalysis.findFirst({
    where: { id, userId: user.id },
    include: analysisInclude
  });

  if (!row) notFound();

  const analysis = mapAnalysisRecord(row);
  const score = typeof row.score === "number" ? row.score : null;
  const { configs } = await listUserProviderConfigs(user.id);
  const providerConfigOptions = configs.map((c) => ({ id: c.id, name: c.name }));
  const trendRows = await prisma.resumeAnalysis.findMany({
    where: {
      userId: user.id,
      ...(row.fileName ? { fileName: row.fileName } : {})
    },
    orderBy: { createdAt: "asc" },
    take: 8,
    select: {
      id: true,
      createdAt: true,
      score: true
    }
  });

  const summaryCards = [
    { label: "命中关键词", value: analysis.matchedKeywords.length },
    { label: "待补充关键词", value: analysis.missingKeywords.length },
    { label: "优化建议", value: analysis.suggestions.length },
    { label: "面试问答", value: analysis.interviewQuestions.length }
  ];

  const topMissing = analysis.missingKeywords.slice(0, 3).join("、") || "当前没有明显缺失关键词。";

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto max-w-6xl space-y-6">
        <div className="rounded-[2rem] border border-zinc-800 glass-panel p-8 shadow-[0_30px_80px_rgba(120,94,46,0.08)]">
          <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-3xl">
              <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Result</p>
              <h1 className="mt-2 text-4xl font-semibold text-white">分析结果</h1>
              <p className="mt-3 text-sm leading-6 text-zinc-400">{getScoreSummary(score)}</p>

              <div className="mt-5 flex flex-wrap gap-3">
                <Link
                  href="/history"
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                >
                  查看历史结果
                </Link>
                <Link
                  href="/tasks"
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                >
                  返回任务列表
                </Link>
                <Link
                  href={`/interview-prep?from=${row.id}`}
                  className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-600 hover:text-white"
                >
                  生成面试题 →
                </Link>
                <Link
                  href="/upload"
                  className="rounded-full btn-primary px-4 py-2 text-sm font-medium text-white transition hover:border-transparent"
                >
                  新建分析
                </Link>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <StarResultButton resultId={row.id} initialStarred={row.starred} />
            </div>
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-3">
            <article className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">当前焦点</p>
              <p className="mt-2 text-lg font-semibold text-white">{getFocusLabel(score)}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{topMissing}</p>
            </article>
            <article className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">本次文件</p>
              <p className="mt-2 break-words text-lg font-semibold text-white">{row.fileName || "未命名文件"}</p>
              <p className="mt-2 text-sm text-zinc-400">{row.createdAt.toLocaleString("zh-CN")}</p>
            </article>
            <article className="rounded-[1.5rem] border border-zinc-800 bg-zinc-900/50 p-4">
              <p className="text-xs uppercase tracking-[0.24em] text-zinc-400">建议动作</p>
              <p className="mt-2 text-lg font-semibold text-white">先改再重跑一次</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">
                根据建议修改简历正文后，直接在下方编辑器里重新分析，最快看到分数变化。
              </p>
            </article>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[300px_1fr]">
          <aside className="space-y-4 rounded-[2rem] border border-zinc-800 glass-panel p-6 lg:sticky lg:top-6 lg:self-start">
            <ScoreRing score={score} subtitle="0 到 100 分，分数越高代表越接近岗位要求。" />
            <div className="rounded-3xl bg-zinc-900/50 p-4">
              <p className="text-sm text-zinc-400">优先补充</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">{topMissing}</p>
            </div>
            <div className="rounded-3xl bg-zinc-900/50 p-4">
              <p className="text-sm text-zinc-400">总结改写</p>
              <p className="mt-2 text-sm leading-6 text-zinc-300">
                {analysis.rewrittenSummary
                  ? `${analysis.rewrittenSummary.slice(0, 72)}${analysis.rewrittenSummary.length > 72 ? "..." : ""}`
                  : "当前没有生成总结改写。"}
              </p>
            </div>
          </aside>

          <div className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
              {summaryCards.map((item) => (
                <section key={item.label} className="rounded-3xl border border-zinc-800 glass-panel p-5">
                  <p className="text-sm text-zinc-400">{item.label}</p>
                  <p className="mt-3 text-3xl font-semibold text-white">{item.value}</p>
                </section>
              ))}
            </div>

            {analysis.missingKeywords.length > 0 && (
              <KeywordExamplesPanel
                analysisId={row.id}
                missingKeywords={analysis.missingKeywords}
                providerConfigs={providerConfigOptions}
              />
            )}
            <ResultWorkspace
              analysisId={row.id}
              fileName={row.fileName}
              score={score}
              createdAt={row.createdAt.toLocaleString("zh-CN")}
              resumeText={row.resumeText}
              jobDescription={row.jobDescription}
              analysis={analysis}
              trendPoints={trendRows.map((item) => ({
                label: item.createdAt.toLocaleDateString("zh-CN", {
                  month: "numeric",
                  day: "numeric"
                }),
                score: item.score
              }))}
            />
          </div>
        </div>
      </section>
    </main>
  );
}
