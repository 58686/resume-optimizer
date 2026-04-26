type ScoreRingProps = {
  score: number | null;
  size?: number;
  strokeWidth?: number;
  label?: string;
  subtitle?: string;
};

function getScoreTone(score: number | null) {
  if (score === null) {
    return {
      colorStart: "#d6d3d1",
      colorEnd: "#a8a29e",
      textClass: "text-zinc-400",
      status: "等待评分",
      glowColor: "rgba(168,162,158,0.2)"
    };
  }

  if (score >= 80) {
    return {
      colorStart: "#34d399",
      colorEnd: "#10b981",
      textClass: "text-emerald-600",
      status: "高度匹配",
      glowColor: "rgba(52,211,153,0.3)"
    };
  }

  if (score >= 60) {
    return {
      colorStart: "#fbbf24",
      colorEnd: "#f59e0b",
      textClass: "text-amber-600",
      status: "仍可优化",
      glowColor: "rgba(251,191,36,0.3)"
    };
  }

  return {
    colorStart: "#f87171",
    colorEnd: "#ef4444",
    textClass: "text-red-600",
    status: "需重点改进",
    glowColor: "rgba(248,113,113,0.3)"
  };
}

export function ScoreRing({
  score,
  size = 140,
  strokeWidth = 10,
  label = "匹配分",
  subtitle
}: ScoreRingProps) {
  const safeScore = score === null ? 0 : Math.max(0, Math.min(100, score));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const progress = circumference - (safeScore / 100) * circumference;
  const tone = getScoreTone(score);
  const gradientId = `score-gradient-${size}-${score}`;

  return (
    <div className="flex flex-col items-center text-center">
      <div
        className="relative"
        style={{
          height: size,
          width: size,
          filter: `drop-shadow(0 0 10px ${tone.glowColor})`
        }}
      >
        <svg className="h-full w-full -rotate-90" viewBox={`0 0 ${size} ${size}`}>
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={tone.colorStart} />
              <stop offset="100%" stopColor={tone.colorEnd} />
            </linearGradient>
          </defs>
          {/* Background track */}
          <circle
            className="stroke-stone-100"
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            strokeWidth={strokeWidth}
          />
          {/* Progress arc */}
          <circle
            stroke={`url(#${gradientId})`}
            cx={size / 2}
            cy={size / 2}
            fill="none"
            r={radius}
            strokeDasharray={circumference}
            strokeDashoffset={progress}
            strokeLinecap="round"
            strokeWidth={strokeWidth}
            style={{
              transition: "stroke-dashoffset 1s cubic-bezier(0.4, 0, 0.2, 1)"
            }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-[10px] font-semibold uppercase tracking-[0.25em] text-zinc-400">{label}</span>
          <span className="mt-0.5 text-3xl font-extrabold text-white">{score ?? "--"}</span>
          <span className={`mt-0.5 text-[11px] font-semibold ${tone.textClass}`}>{tone.status}</span>
        </div>
      </div>
      {subtitle ? <p className="mt-3 text-sm text-zinc-400">{subtitle}</p> : null}
    </div>
  );
}
