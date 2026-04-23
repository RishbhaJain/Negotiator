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
const THEM_SILENCE_MS = 1500; // fire analysis this long after "them" stops talking

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
  const [activeSpeaker, setActiveSpeaker] = useState<"you" | "them">("you");

  const recentBufferRef = useRef<string>("");
  const themDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const durationTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeSpeakerRef = useRef<"you" | "them">("you");
  activeSpeakerRef.current = activeSpeaker;
  // Always-current ref so the debounce closure calls the latest runAnalysis
  const runAnalysisRef = useRef<() => void>(() => {});

  // Space bar toggles speaker while session is active
  useEffect(() => {
    if (!sessionActive) return;
    function onKey(e: KeyboardEvent) {
      if (e.code === "Space" && e.target === document.body) {
        e.preventDefault();
        setActiveSpeaker((s) => (s === "you" ? "them" : "you"));
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [sessionActive]);

  const scheduleAnalysisRef = useRef<() => void>(() => {});

  const handleChunk = useCallback((chunk: TranscriptChunk) => {
    const overridden: TranscriptChunk = {
      ...chunk,
      speaker: activeSpeakerRef.current,
      highlighted:
        activeSpeakerRef.current === "you"
          ? chunk.highlighted
          : chunk.text,
    };

    if (overridden.speaker === "you") {
      const { hedges, scoreDelta } = detectHedges(overridden.text);
      if (hedges.length > 0) {
        setTotalHedges((prev) => prev + hedges.length);
      }
      if (scoreDelta !== 0) {
        setScore((prev) => Math.max(0, Math.min(100, prev + scoreDelta)));
      }
    }

    setChunks((prev) => [...prev, overridden]);

    const label = overridden.speaker === "you" ? "YOU" : "THEM";
    recentBufferRef.current += `${label}: ${overridden.text}\n`;

    // Debounce analysis trigger on "them" speech
    if (overridden.speaker === "them") {
      scheduleAnalysisRef.current();
    }
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
        if (Array.isArray(data.talkingPoints)) {
          setTalkingPoints(data.talkingPoints);
        }
      } else {
        console.error("analyze: HTTP", res.status, await res.text());
      }
    } catch (e) {
      console.error("analyze: fetch failed", e);
    } finally {
      setIsAnalyzing(false);
    }
  }, [githubContext]);

  // Keep refs current every render so stale closures always call the latest versions
  runAnalysisRef.current = runAnalysis;
  scheduleAnalysisRef.current = () => {
    if (themDebounceRef.current) clearTimeout(themDebounceRef.current);
    themDebounceRef.current = setTimeout(() => {
      runAnalysisRef.current();
    }, THEM_SILENCE_MS);
  };

  function startSession() {
    setSessionActive(true);
    setActiveSpeaker("you");
    setScore(INITIAL_SCORE);
    setScoreHistory([INITIAL_SCORE]);
    setTotalHedges(0);
    setTalkingPoints([]);
    setChunks([]);
    setDurationSeconds(0);
    recentBufferRef.current = "";
    start(selectedDeviceId || undefined);

    durationTimerRef.current = setInterval(
      () => setDurationSeconds((s) => s + 1),
      1000
    );
  }

  function stopSession() {
    stop();
    setSessionActive(false);
    if (themDebounceRef.current) clearTimeout(themDebounceRef.current);
    if (durationTimerRef.current) clearInterval(durationTimerRef.current);
    runAnalysis();
  }

  useEffect(() => {
    return () => {
      if (themDebounceRef.current) clearTimeout(themDebounceRef.current);
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
          {sessionActive && (
            <p className="text-xs" style={{ color: "var(--muted)" }}>
              Press <kbd style={{ background: "var(--surface)", border: "1px solid var(--border)", borderRadius: 4, padding: "0 4px" }}>Space</kbd> to toggle speaker
            </p>
          )}
          <TranscriptPanel chunks={chunks} activeSpeaker={sessionActive ? activeSpeaker : undefined} onToggleSpeaker={sessionActive ? () => setActiveSpeaker((prev) => prev === "you" ? "them" : "you") : undefined} />
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
