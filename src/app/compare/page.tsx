import Link from "next/link";
import { notFound } from "next/navigation";
import { analysisInclude, mapAnalysisRecord } from "@/lib/analysis-record";
import { requireCurrentUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function ComparePage({
  searchParams
}: {
  searchParams?: Promise<{ a?: string; b?: string }>;
}) {
  const user = await requireCurrentUser();
  const params = searchParams ? await searchParams : {};
  const { a, b } = params;

  if (!a || !b || a === b) notFound();

  const [rowA, rowB] = await Promise.all([
    prisma.resumeAnalysis.findFirst({ where: { id: a, userId: user.id }, include: analysisInclude }),
    prisma.resumeAnalysis.findFirst({ where: { id: b, userId: user.id }, include: analysisInclude })
  ]);

  if (!rowA || !rowB) notFound();

  const analysisA = mapAnalysisRecord(rowA);
  const analysisB = mapAnalysisRecord(rowB);

  const scoreA = rowA.score ?? null;
  const scoreB = rowB.score ?? null;
  const scoreDiff = scoreA !== null && scoreB !== null ? scoreB - scoreA : null;

  const setA = new Set(analysisA.matchedKeywords);
  const setB = new Set(analysisB.matchedKeywords);
  const missingA = new Set(analysisA.missingKeywords);
  const missingB = new Set(analysisB.missingKeywords);

  // Keywords newly matched in B (were missing in A, now matched in B)
  const resolved = analysisA.missingKeywords.filter((kw) => setB.has(kw));
  // Keywords still missing in both
  const stillMissing = analysisA.missingKeywords.filter((kw) => missingB.has(kw));
  // New matches in B that weren't in A at all
  const newMatches = analysisB.matchedKeywords.filter((kw) => !setA.has(kw) && !resolved.includes(kw));
  // New missing in B that weren't tracked before
  const newMissing = analysisB.missingKeywords.filter((kw) => !missingA.has(kw) && !setA.has(kw));

  function ScoreCell({ score }: { score: number | null }) {
    const color = score === null ? "text-zinc-400" : score >= 80 ? "text-emerald-400" : score >= 60 ? "text-amber-400" : "text-red-400";
    return <span className={`text-5xl font-extrabold ${color}`}>{score ?? "--"}</span>;
  }

  return (
    <main className="min-h-screen px-6 py-12">
      <section className="mx-auto max-w-6xl space-y-6">
        {/* Header */}
        <div className="rounded-[2rem] border border-zinc-800 glass-panel p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.3em] text-zinc-500">Compare</p>
          <h1 className="mt-2 text-4xl font-bold text-white">版本对比</h1>
          <p className="mt-2 text-sm text-zinc-400">对比两次分析的分数变化、关键词覆盖差异和优化建议。</p>
          <div className="mt-4 flex gap-3">
            <Link href="/history" className="rounded-full border border-zinc-700 px-4 py-2 text-sm font-medium text-zinc-300 transition hover:border-zinc-500 hover:text-white">
              返回历史记录
            </Link>
          </div>
        </div>

        {/* Score comparison */}
        <div className="grid gap-4 md:grid-cols-3">
          <div className="rounded-[2rem] border border-zinc-800 glass-panel p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">版本 A</p>
            <p className="mt-1 text-sm text-zinc-400 truncate">{rowA.fileName || "未命名文件"}</p>
            <p className="mt-1 text-xs text-zinc-600">{rowA.createdAt.toLocaleString("zh-CN")}</p>
            <div className="mt-4"><ScoreCell score={scoreA} /></div>
            <p className="mt-2 text-xs text-zinc-500">分</p>
          </div>

          <div className="flex flex-col items-center justify-center rounded-[2rem] border border-zinc-800 glass-panel p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">分数变化</p>
            {scoreDiff !== null ? (
              <p className={`mt-3 text-5xl font-extrabold ${scoreDiff > 0 ? "text-emerald-400" : scoreDiff < 0 ? "text-red-400" : "text-zinc-400"}`}>
                {scoreDiff > 0 ? "+" : ""}{scoreDiff}
              </p>
            ) : (
              <p className="mt-3 text-3xl text-zinc-600">N/A</p>
            )}
            <p className="mt-2 text-xs text-zinc-500">A → B</p>
          </div>

          <div className="rounded-[2rem] border border-zinc-800 glass-panel p-6 text-center">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">版本 B</p>
            <p className="mt-1 text-sm text-zinc-400 truncate">{rowB.fileName || "未命名文件"}</p>
            <p className="mt-1 text-xs text-zinc-600">{rowB.createdAt.toLocaleString("zh-CN")}</p>
            <div className="mt-4"><ScoreCell score={scoreB} /></div>
            <p className="mt-2 text-xs text-zinc-500">分</p>
          </div>
        </div>

        {/* Keyword diff */}
        <div className="rounded-[2rem] border border-zinc-800 glass-panel p-6">
          <h2 className="text-xl font-bold text-white">关键词变化</h2>
          <div className="mt-5 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {/* Resolved */}
            <div className="rounded-2xl border border-emerald-200/40 bg-emerald-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-emerald-500">✓ 已补齐</p>
              <p className="mt-1 text-xs text-zinc-500">原来缺失，现在命中</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {resolved.length > 0 ? resolved.map((kw) => (
                  <span key={kw} className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-0.5 text-xs font-medium text-emerald-400">{kw}</span>
                )) : <span className="text-xs text-zinc-600">无</span>}
              </div>
            </div>
            {/* New matches */}
            <div className="rounded-2xl border border-blue-400/30 bg-blue-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-blue-400">＋ 新增命中</p>
              <p className="mt-1 text-xs text-zinc-500">B 版本新增的匹配</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {newMatches.length > 0 ? newMatches.map((kw) => (
                  <span key={kw} className="rounded-full border border-blue-400/30 bg-blue-400/10 px-2.5 py-0.5 text-xs font-medium text-blue-400">{kw}</span>
                )) : <span className="text-xs text-zinc-600">无</span>}
              </div>
            </div>
            {/* Still missing */}
            <div className="rounded-2xl border border-amber-400/30 bg-amber-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-amber-400">△ 仍然缺失</p>
              <p className="mt-1 text-xs text-zinc-500">两个版本都未覆盖</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {stillMissing.length > 0 ? stillMissing.map((kw) => (
                  <span key={kw} className="rounded-full border border-amber-400/30 bg-amber-400/10 px-2.5 py-0.5 text-xs font-medium text-amber-400">{kw}</span>
                )) : <span className="text-xs text-zinc-600">无</span>}
              </div>
            </div>
            {/* New missing */}
            <div className="rounded-2xl border border-red-400/30 bg-red-500/5 p-4">
              <p className="text-xs font-bold uppercase tracking-widest text-red-400">✕ 新增缺失</p>
              <p className="mt-1 text-xs text-zinc-500">B 版本出现的新缺口</p>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {newMissing.length > 0 ? newMissing.map((kw) => (
                  <span key={kw} className="rounded-full border border-red-400/30 bg-red-400/10 px-2.5 py-0.5 text-xs font-medium text-red-400">{kw}</span>
                )) : <span className="text-xs text-zinc-600">无</span>}
              </div>
            </div>
          </div>
        </div>

        {/* Suggestions diff */}
        <div className="grid gap-6 lg:grid-cols-2">
          {([
            { label: "版本 A 的优化建议", suggestions: analysisA.suggestions, href: `/result/${a}` },
            { label: "版本 B 的优化建议", suggestions: analysisB.suggestions, href: `/result/${b}` }
          ] as const).map(({ label, suggestions, href }) => (
            <div key={label} className="rounded-[2rem] border border-zinc-800 glass-panel p-6">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-white">{label}</h2>
                <Link href={href} className="text-xs text-zinc-500 underline-offset-4 hover:text-zinc-300 hover:underline">
                  查看完整结果
                </Link>
              </div>
              <ul className="mt-4 space-y-2">
                {suggestions.length > 0 ? suggestions.map((s, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm leading-6 text-zinc-300">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-zinc-500" />
                    {s}
                  </li>
                )) : <li className="text-sm text-zinc-600">暂无建议</li>}
              </ul>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
