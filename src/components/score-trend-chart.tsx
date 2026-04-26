"use client";

export function ScoreTrendChart({
  points
}: {
  points: Array<{ label: string; score: number | null }>;
}) {
  const validPoints = points.filter((point) => typeof point.score === "number") as Array<{
    label: string;
    score: number;
  }>;

  if (validPoints.length < 2) {
    return (
      <div className="rounded-3xl border border-dashed border-zinc-700 glass-panel p-5 text-sm text-zinc-400">
        数据不足，至少需要两次分析结果才能生成趋势图。
      </div>
    );
  }

  const width = 480;
  const height = 180;
  const padding = 20;
  const stepX = (width - padding * 2) / Math.max(validPoints.length - 1, 1);
  const pointsAttr = validPoints
    .map((point, index) => {
      const x = padding + stepX * index;
      const y = height - padding - (point.score / 100) * (height - padding * 2);
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <section className="rounded-[2rem] border border-zinc-800 glass-panel p-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm uppercase tracking-[0.28em] text-zinc-400">Trend</p>
          <h3 className="mt-2 text-2xl font-semibold text-white">得分趋势</h3>
        </div>
        <span className="text-sm text-zinc-400">最近 {validPoints.length} 次</span>
      </div>
      <svg viewBox={`0 0 ${width} ${height}`} className="mt-6 h-48 w-full">
        <path d={`M ${pointsAttr.replace(/ /g, " L ")}`} fill="none" stroke="#1c1917" strokeWidth="3" />
        {validPoints.map((point, index) => {
          const x = padding + stepX * index;
          const y = height - padding - (point.score / 100) * (height - padding * 2);
          return (
            <g key={`${point.label}-${index}`}>
              <circle cx={x} cy={y} r="4" fill="#1c1917" />
              <text x={x} y={y - 10} textAnchor="middle" fontSize="11" fill="#44403c">
                {point.score}
              </text>
              <text x={x} y={height - 4} textAnchor="middle" fontSize="10" fill="#78716c">
                {point.label}
              </text>
            </g>
          );
        })}
      </svg>
    </section>
  );
}
