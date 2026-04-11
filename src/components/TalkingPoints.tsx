"use client";

import { TalkingPoint } from "@/app/api/analyze/route";

interface Props {
  points: TalkingPoint[];
  isLoading: boolean;
}

export default function TalkingPoints({ points, isLoading }: Props) {
  return (
    <div
      className="rounded-lg p-4 h-full"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        minHeight: "200px",
        maxHeight: "320px",
        overflowY: "auto",
      }}
    >
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xs font-semibold uppercase tracking-widest" style={{ color: "var(--muted)" }}>
          Talking Points
        </span>
        {isLoading && (
          <span className="text-xs" style={{ color: "var(--blue)" }}>
            analyzing…
          </span>
        )}
      </div>

      {points.length === 0 && !isLoading && (
        <p className="text-sm" style={{ color: "var(--muted)" }}>
          AI-powered talking points from your GitHub context will appear here as you speak.
        </p>
      )}

      <div className="space-y-3">
        {points.map((pt, i) => (
          <div
            key={i}
            className="talking-point-card rounded-lg p-3"
            style={{
              background: "rgba(68, 136, 255, 0.07)",
              border: "1px solid rgba(68, 136, 255, 0.2)",
            }}
          >
            <div className="flex items-start gap-2">
              <span style={{ color: "var(--blue)", fontSize: "1rem" }}>⚡</span>
              <div>
                <p className="text-sm leading-snug" style={{ color: "var(--text)" }}>
                  {pt.point}
                </p>
                <p className="text-xs mt-1" style={{ color: "var(--muted)" }}>
                  {pt.source}
                  {pt.trigger ? ` · re: "${pt.trigger}"` : ""}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
