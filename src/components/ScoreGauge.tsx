"use client";

interface Props {
  score: number; // 0–100
}

export default function ScoreGauge({ score }: Props) {
  const clamped = Math.max(0, Math.min(100, score));

  const color =
    clamped >= 75 ? "var(--green)" : clamped >= 50 ? "var(--yellow)" : "var(--red)";

  const label =
    clamped >= 80
      ? "Strong"
      : clamped >= 65
      ? "Good"
      : clamped >= 50
      ? "Fair"
      : clamped >= 35
      ? "Weak"
      : "Critical";

  // SVG arc gauge
  const radius = 54;
  const circumference = Math.PI * radius; // half circle
  const dashOffset = circumference * (1 - clamped / 100);

  return (
    <div className="flex flex-col items-center justify-center p-4">
      <div className="relative">
        <svg width="140" height="80" viewBox="0 0 140 80">
          {/* Background arc */}
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke="var(--border)"
            strokeWidth="10"
            strokeLinecap="round"
          />
          {/* Foreground arc */}
          <path
            d="M 10 70 A 60 60 0 0 1 130 70"
            fill="none"
            stroke={color}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${circumference}`}
            strokeDashoffset={`${dashOffset}`}
            style={{ transition: "stroke-dashoffset 0.6s ease, stroke 0.6s ease" }}
          />
        </svg>

        {/* Score number */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-end pb-1"
          style={{ bottom: "0" }}
        >
          <span className="text-3xl font-bold leading-none" style={{ color }}>
            {clamped}
          </span>
          <span className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
            / 100
          </span>
        </div>
      </div>

      <div
        className="mt-2 text-sm font-semibold tracking-wide uppercase"
        style={{ color, letterSpacing: "0.08em" }}
      >
        {label}
      </div>
      <div className="text-xs mt-0.5" style={{ color: "var(--muted)" }}>
        Advocacy Score
      </div>
    </div>
  );
}
