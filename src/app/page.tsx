"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SetupPanel from "@/components/SetupPanel";
import TranscriptPanel from "@/components/TranscriptPanel";
import ScoreGauge from "@/components/ScoreGauge";
import TalkingPoints from "@/components/TalkingPoints";
import SessionStats from "@/components/SessionStats";
import { GitHubContext } from "@/lib/githubContext";
import { detectHedges, highlightHedges } from "@/lib/hedgeDetector";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { TalkingPoint } from "@/app/api/analyze/route";

const INITIAL_SCORE = 85;
const ANALYSIS_INTERVAL_MS = 15000; // 15 seconds

export default function Home() {
  const [githubContext, setGithubContext] = useState<GitHubContext | null>(null);
  const [score, setScore] = useState(INITIAL_SCORE);
  const [scoreHistory, setScoreHistory] = useState<number[]>([INITIAL_SCORE]);
  const [totalHedges, setTotalHedges] = useState(0);
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [transcriptHtml, setTranscriptHtml] = useState("");
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  // Buffer of recent transcript chunks for analysis
  const recentChunksRef = useRef<string>("");
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Called on every finalized speech chunk
  const handleFinalChunk = useCallback(
    (chunk: string) => {
      // 1. Instant hedge detection (no API, no latency)
      const { hedges, scoreDelta } = detectHedges(chunk);

      if (hedges.length > 0 || scoreDelta !== 0) {
        setTotalHedges((prev) => prev + hedges.length);
        setScore((prev) => Math.max(0, Math.min(100, prev + scoreDelta)));
      }

      // 2. Highlight hedges in the transcript HTML
      const highlighted = highlightHedges(chunk);
      setTranscriptHtml((prev) => prev + highlighted);

      // 3. Accumulate for Claude analysis
      recentChunksRef.current += " " + chunk;
    },
    []
  );

  const { transcript: _transcript, interimText, isListening, error, start, stop, reset } =
    useSpeechRecognition(handleFinalChunk);

  // Trigger AI analysis every ANALYSIS_INTERVAL_MS
  const runAnalysis = useCallback(async () => {
    const chunk = recentChunksRef.current.trim();
    if (!chunk || !githubContext) return;

    recentChunksRef.current = ""; // reset buffer
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: chunk, githubContext }),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.scoreDelta) {
          setScore((prev) => {
            const next = Math.max(0, Math.min(100, prev + data.scoreDelta));
            setScoreHistory((h) => [...h, next]);
            return next;
          });
        }
        if (data.talkingPoints?.length > 0) {
          setTalkingPoints(data.talkingPoints);
        }
      }
    } catch {
      // Silent fail — analysis is non-critical
    } finally {
      setIsAnalyzing(false);
    }
  }, [githubContext]);

  function startSession() {
    setSessionActive(true);
    setScore(INITIAL_SCORE);
    setScoreHistory([INITIAL_SCORE]);
    setTotalHedges(0);
    setTalkingPoints([]);
    setTranscriptHtml("");
    setDurationSeconds(0);
    recentChunksRef.current = "";
    reset();
    start();

    // Analysis interval
    analysisTimerRef.current = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);
    // Duration counter
    durationTimerRef.current = setInterval(
      () => setDurationSeconds((s) => s + 1),
      1000
    );
  }

  function stopSession() {
    stop();
    setSessionActive(false);
    if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    // Run one final analysis
    runAnalysis();
  }

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  if (!githubContext) {
    return <SetupPanel onReady={setGithubContext} />;
  }

  return (
    <div
      className="min-h-screen p-4 flex flex-col gap-4"
      style={{ background: "var(--bg)", maxWidth: "1100px", margin: "0 auto" }}
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="text-xl font-bold" style={{ color: "var(--text)" }}>
            The Negotiator
          </span>
          {sessionActive && isListening && (
            <span className="flex items-center gap-1.5 text-xs font-semibold" style={{ color: "var(--red)" }}>
              <span className="live-dot inline-block w-2 h-2 rounded-full" style={{ background: "var(--red)" }} />
              LIVE
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <span className="text-xs" style={{ color: "var(--muted)" }}>
            {githubContext.username} · {githubContext.recentActivity}
          </span>
          <button
            onClick={sessionActive ? stopSession : startSession}
            className="px-4 py-2 rounded-lg text-sm font-semibold transition-all"
            style={{
              background: sessionActive ? "rgba(255,68,68,0.15)" : "var(--blue)",
              color: sessionActive ? "var(--red)" : "white",
              border: sessionActive ? "1px solid rgba(255,68,68,0.4)" : "none",
            }}
          >
            {sessionActive ? "Stop Session" : "Start Meeting"}
          </button>
        </div>
      </div>

      {/* Error banner */}
      {error && (
        <div
          className="px-4 py-2 rounded-lg text-sm"
          style={{ background: "rgba(255,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(255,68,68,0.3)" }}
        >
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 280px" }}>
        {/* Left column */}
        <div className="flex flex-col gap-4">
          {/* Transcript */}
          <div>
            <div className="text-xs font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--muted)" }}>
              Live Transcript
            </div>
            <TranscriptPanel html={transcriptHtml} interimText={interimText} />
          </div>

          {/* Talking points */}
          <div>
            <TalkingPoints points={talkingPoints} isLoading={isAnalyzing} />
          </div>
        </div>

        {/* Right column — score */}
        <div className="flex flex-col gap-4">
          {/* Score gauge */}
          <div
            className="rounded-lg"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <ScoreGauge score={score} />
          </div>

          {/* GitHub context summary */}
          <div
            className="rounded-lg p-4"
            style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
          >
            <div className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: "var(--muted)" }}>
              GitHub Context
            </div>
            <div className="space-y-2">
              {githubContext.topLanguages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {githubContext.topLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{ background: "rgba(68,136,255,0.1)", color: "var(--blue)", border: "1px solid rgba(68,136,255,0.2)" }}
                    >
                      {lang}
                    </span>
                  ))}
                </div>
              )}
              <div className="text-xs" style={{ color: "var(--muted)" }}>
                ★ {githubContext.totalStars} total stars
              </div>
              <div className="space-y-1.5 mt-2">
                {githubContext.repos.slice(0, 3).map((repo) => (
                  <div key={repo.name} className="text-xs" style={{ color: "var(--muted)" }}>
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>{repo.name}</span>
                    {repo.description && ` · ${repo.description.slice(0, 40)}`}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom stats bar */}
      <SessionStats
        hedgeCount={totalHedges}
        durationSeconds={durationSeconds}
        scoreHistory={scoreHistory}
      />
    </div>
  );
}
