"use client";

interface Props {
  hedgeCount: number;
  durationSeconds: number;
  scoreHistory: number[];  // last N scores for sparkline
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, "0");
  const s = (seconds % 60).toString().padStart(2, "0");
  return `${m}:${s}`;
}

export default function SessionStats({ hedgeCount, durationSeconds, scoreHistory }: Props) {
  // Simple sparkline using SVG
  const recent = scoreHistory.slice(-12);
  const sparkWidth = 80;
  const sparkHeight = 24;

  const points =
    recent.length > 1
      ? recent
          .map((v, i) => {
            const x = (i / (recent.length - 1)) * sparkWidth;
            const y = sparkHeight - (v / 100) * sparkHeight;
            return `${x},${y}`;
          })
          .join(" ")
      : "";

  const lastScore = recent[recent.length - 1] ?? 85;
  const prevScore = recent[recent.length - 2] ?? lastScore;
  const trend = lastScore > prevScore ? "↑" : lastScore < prevScore ? "↓" : "→";
  const trendColor =
    lastScore > prevScore
      ? "var(--green)"
      : lastScore < prevScore
      ? "var(--red)"
      : "var(--muted)";

  return (
    <div
      className="flex items-center justify-between px-4 py-3 rounded-lg"
      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
    >
      {/* Hedges */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Hedges
        </span>
        <span
          className="text-base font-bold"
          style={{ color: hedgeCount > 5 ? "var(--red)" : hedgeCount > 2 ? "var(--yellow)" : "var(--text)" }}
        >
          {hedgeCount}
        </span>
      </div>

      <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />

      {/* Duration */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Duration
        </span>
        <span className="text-base font-bold" style={{ color: "var(--text)" }}>
          {formatDuration(durationSeconds)}
        </span>
      </div>

      <div style={{ width: "1px", height: "24px", background: "var(--border)" }} />

      {/* Trend + sparkline */}
      <div className="flex items-center gap-2">
        <span className="text-xs font-medium uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Trend
        </span>
        <span className="text-base font-bold" style={{ color: trendColor }}>
          {trend}
        </span>
        {points && (
          <svg width={sparkWidth} height={sparkHeight} viewBox={`0 0 ${sparkWidth} ${sparkHeight}`}>
            <polyline
              points={points}
              fill="none"
              stroke="var(--blue)"
              strokeWidth="1.5"
              strokeLinejoin="round"
              strokeLinecap="round"
            />
          </svg>
        )}
      </div>
    </div>
  );
}
