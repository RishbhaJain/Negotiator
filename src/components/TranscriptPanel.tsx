"use client";

import { useEffect, useRef } from "react";

interface Props {
  html: string;       // transcript with <mark> highlights already injected
  interimText: string;
}

export default function TranscriptPanel({ html, interimText }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [html, interimText]);

  return (
    <div
      className="h-full overflow-y-auto rounded-lg p-4 text-sm leading-relaxed"
      style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        minHeight: "200px",
        maxHeight: "320px",
        color: "var(--text)",
      }}
    >
      {html || interimText ? (
        <>
          {/* Render finalized transcript with hedge highlights */}
          <span dangerouslySetInnerHTML={{ __html: html }} />
          {/* Interim (in-progress) text — dimmed */}
          {interimText && (
            <span style={{ color: "var(--muted)", fontStyle: "italic" }}>
              {interimText}
            </span>
          )}
        </>
      ) : (
        <span style={{ color: "var(--muted)" }}>
          Transcript will appear here as you speak…
        </span>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
