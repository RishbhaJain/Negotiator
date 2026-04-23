"use client";

import { useState } from "react";
import { TalkingPoint } from "@/app/api/analyze/route";

interface Props {
  points: TalkingPoint[];
  isLoading: boolean;
  onTogglePin: (index: number) => void;
}

export default function TalkingPoints({ points, isLoading, onTogglePin }: Props) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

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
            className="talking-point-card rounded-lg p-3 relative"
            style={{
              background: pt.pinned
                ? "rgba(68, 136, 255, 0.12)"
                : "rgba(68, 136, 255, 0.07)",
              border: pt.pinned
                ? "1px solid rgba(68, 136, 255, 0.4)"
                : "1px solid rgba(68, 136, 255, 0.2)",
            }}
            onMouseEnter={() => setHoveredIndex(i)}
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <button
              onClick={() => onTogglePin(i)}
              title={pt.pinned ? "Unpin" : "Pin to keep"}
              style={{
                position: "absolute",
                top: "8px",
                right: "8px",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: "2px",
                borderRadius: "4px",
                opacity: pt.pinned || hoveredIndex === i ? 1 : 0,
                transition: "opacity 0.15s ease",
                color: pt.pinned ? "var(--blue)" : "var(--muted)",
                display: "flex",
                alignItems: "center",
                lineHeight: 0,
              }}
            >
              <PinIcon pinned={!!pt.pinned} />
            </button>

            <div className="flex items-start gap-2">
              <span style={{ color: "var(--blue)", fontSize: "1rem" }}>⚡</span>
              <div style={{ paddingRight: "18px" }}>
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

function PinIcon({ pinned }: { pinned: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill={pinned ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 17v5" />
      <path d="M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z" />
    </svg>
  );
}
