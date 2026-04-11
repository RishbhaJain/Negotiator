"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import SetupPanel from "@/components/SetupPanel";
import TranscriptPanel from "@/components/TranscriptPanel";
import ScoreGauge from "@/components/ScoreGauge";
import TalkingPoints from "@/components/TalkingPoints";
import SessionStats from "@/components/SessionStats";
import { GitHubContext } from "@/lib/githubContext";
import { detectHedges } from "@/lib/hedgeDetector";
import { useDeepgramTranscription, TranscriptChunk } from "@/hooks/useDeepgramTranscription";
import { TalkingPoint } from "@/app/api/analyze/route";

const INITIAL_SCORE = 85;
const ANALYSIS_INTERVAL_MS = 15000;

export default function Home() {
  const [githubContext, setGithubContext] = useState<GitHubContext | null>(null);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [score, setScore] = useState(INITIAL_SCORE);
  const [scoreHistory, setScoreHistory] = useState<number[]>([INITIAL_SCORE]);
  const [totalHedges, setTotalHedges] = useState(0);
  const [talkingPoints, setTalkingPoints] = useState<TalkingPoint[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [chunks, setChunks] = useState<TranscriptChunk[]>([]);
  const [durationSeconds, setDurationSeconds] = useState(0);
  const [sessionActive, setSessionActive] = useState(false);

  // Accumulate recent transcript for OpenAI analysis (labeled: YOU/THEM)
  const recentBufferRef = useRef<string>("");
  const analysisTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleChunk = useCallback((chunk: TranscriptChunk) => {
    // 1. Instant hedge detection — only on YOUR speech
    if (chunk.speaker === "you") {
      const { hedges, scoreDelta } = detectHedges(chunk.text);
      if (hedges.length > 0) {
        setTotalHedges((prev) => prev + hedges.length);
      }
      if (scoreDelta !== 0) {
        setScore((prev) => Math.max(0, Math.min(100, prev + scoreDelta)));
      }
    }

    // 2. Append to rendered transcript
    setChunks((prev) => [...prev, chunk]);

    // 3. Accumulate labeled text for OpenAI analysis
    const label = chunk.speaker === "you" ? "YOU" : "THEM";
    recentBufferRef.current += `${label}: ${chunk.text}\n`;
  }, []);

  const { isListening, error, start, stop } = useDeepgramTranscription(handleChunk);

  const runAnalysis = useCallback(async () => {
    const buffer = recentBufferRef.current.trim();
    if (!buffer || !githubContext) return;

    recentBufferRef.current = "";
    setIsAnalyzing(true);

    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transcript: buffer, githubContext }),
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
      // Silent fail — non-critical
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
    setChunks([]);
    setDurationSeconds(0);
    recentBufferRef.current = "";
    start(selectedDeviceId || undefined);

    analysisTimerRef.current = setInterval(runAnalysis, ANALYSIS_INTERVAL_MS);
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
    runAnalysis(); // final analysis
  }

  useEffect(() => {
    return () => {
      if (analysisTimerRef.current) clearInterval(analysisTimerRef.current);
      if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    };
  }, []);

  if (!githubContext) {
    return (
      <SetupPanel
        onReady={(ctx, deviceId) => {
          setGithubContext(ctx);
          setSelectedDeviceId(deviceId);
        }}
      />
    );
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
            <span
              className="flex items-center gap-1.5 text-xs font-semibold"
              style={{ color: "var(--red)" }}
            >
              <span
                className="live-dot inline-block w-2 h-2 rounded-full"
                style={{ background: "var(--red)" }}
              />
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
              background: sessionActive
                ? "rgba(255,68,68,0.15)"
                : "var(--blue)",
              color: sessionActive ? "var(--red)" : "white",
              border: sessionActive
                ? "1px solid rgba(255,68,68,0.4)"
                : "none",
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
          style={{
            background: "rgba(255,68,68,0.1)",
            color: "var(--red)",
            border: "1px solid rgba(255,68,68,0.3)",
          }}
        >
          {error}
        </div>
      )}

      {/* Main layout */}
      <div className="grid gap-4" style={{ gridTemplateColumns: "1fr 280px" }}>
        {/* Left column */}
        <div className="flex flex-col gap-4">
          <TranscriptPanel chunks={chunks} />
          <TalkingPoints points={talkingPoints} isLoading={isAnalyzing} />
        </div>

        {/* Right column */}
        <div className="flex flex-col gap-4">
          <div
            className="rounded-lg"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <ScoreGauge score={score} />
          </div>

          {/* GitHub context summary */}
          <div
            className="rounded-lg p-4"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
            }}
          >
            <div
              className="text-xs font-semibold uppercase tracking-widest mb-3"
              style={{ color: "var(--muted)" }}
            >
              GitHub Context
            </div>
            <div className="space-y-2">
              {githubContext.topLanguages.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {githubContext.topLanguages.map((lang) => (
                    <span
                      key={lang}
                      className="px-2 py-0.5 rounded text-xs"
                      style={{
                        background: "rgba(68,136,255,0.1)",
                        color: "var(--blue)",
                        border: "1px solid rgba(68,136,255,0.2)",
                      }}
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
                  <div
                    key={repo.name}
                    className="text-xs"
                    style={{ color: "var(--muted)" }}
                  >
                    <span style={{ color: "var(--text)", fontWeight: 500 }}>
                      {repo.name}
                    </span>
                    {repo.description &&
                      ` · ${repo.description.slice(0, 40)}`}
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
