"use client";

import { useEffect, useRef } from "react";
import { TranscriptChunk } from "@/hooks/useDeepgramTranscription";

interface Props {
  chunks: TranscriptChunk[];
  activeSpeaker?: "you" | "them";
  onToggleSpeaker?: () => void;
}

export default function TranscriptPanel({ chunks, activeSpeaker, onToggleSpeaker }: Props) {
  const youBottomRef = useRef<HTMLDivElement>(null);
  const themBottomRef = useRef<HTMLDivElement>(null);

  const youChunks = chunks.filter((c) => c.speaker === "you");
  const themChunks = chunks.filter((c) => c.speaker === "them");

  useEffect(() => {
    youBottomRef.current?.scrollIntoView({ behavior: "smooth" });
    themBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chunks]);

  function renderColumn(
    colChunks: TranscriptChunk[],
    speaker: "you" | "them",
    bottomRef: React.RefObject<HTMLDivElement | null>
  ) {
    const accentColor = speaker === "you" ? "var(--text)" : "var(--blue)";
    const headerColor = speaker === "you" ? "var(--green)" : "var(--blue)";
    const label = speaker === "you" ? "YOU" : "THEM";
    const isActive = activeSpeaker === speaker;

    return (
      <div
        className="flex-1 rounded-lg overflow-hidden flex flex-col"
        style={{
          background: "var(--surface)",
          border: `1px solid var(--border)`,
        }}
      >
        {/* Column header */}
        <div
          className="px-3 py-2 text-xs font-semibold uppercase tracking-widest flex items-center gap-2"
          onClick={onToggleSpeaker}
          style={{
            borderBottom: "1px solid var(--border)",
            color: headerColor,
            cursor: onToggleSpeaker ? "pointer" : "default",
          }}
        >
          <span
            className="inline-block w-1.5 h-1.5 rounded-full"
            style={{
              background: headerColor,
              opacity: isActive ? 1 : 0.3,
              boxShadow: isActive ? `0 0 4px ${headerColor}` : "none",
            }}
          />
          {label}
          {speaker === "you" && (
            <span
              className="ml-auto text-xs font-normal"
              style={{ color: "var(--muted)" }}
            >
              hedging scored
            </span>
          )}
          {speaker === "them" && (
            <span
              className="ml-auto text-xs font-normal"
              style={{ color: "var(--muted)" }}
            >
              triggers talking points
            </span>
          )}
        </div>

        {/* Transcript content */}
        <div
          className="flex-1 overflow-y-auto p-3 text-sm leading-relaxed space-y-2"
          style={{
            minHeight: "160px",
            maxHeight: "260px",
            color: accentColor,
          }}
        >
          {colChunks.length === 0 ? (
            <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
              {speaker === "you"
                ? "Your speech will appear here…"
                : "Their speech will appear here…"}
            </span>
          ) : (
            colChunks.map((chunk, i) => (
              <p key={i} className="leading-snug">
                {speaker === "you" ? (
                  // Render with hedge highlights for "you" column
                  <span
                    dangerouslySetInnerHTML={{ __html: chunk.highlighted }}
                  />
                ) : (
                  // Plain text for "them" column
                  <span>{chunk.text}</span>
                )}
              </p>
            ))
          )}
          <div ref={bottomRef} />
        </div>
      </div>
    );
  }

  return (
    <div>
      <div
        className="text-xs font-semibold uppercase tracking-widest mb-2"
        style={{ color: "var(--muted)" }}
      >
        Live Transcript
      </div>
      <div className="flex gap-3">
        {renderColumn(youChunks, "you", youBottomRef)}
        {renderColumn(themChunks, "them", themBottomRef)}
      </div>
    </div>
  );
}
