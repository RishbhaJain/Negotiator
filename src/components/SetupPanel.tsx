"use client";

import { useState, useEffect } from "react";
import { GitHubContext } from "@/lib/githubContext";

interface Props {
  onReady: (context: GitHubContext, deviceId: string) => void;
}

export default function SetupPanel({ onReady }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [githubContext, setGithubContext] = useState<GitHubContext | null>(null);

  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [devicesLoading, setDevicesLoading] = useState(false);

  // Load audio devices after GitHub context is fetched
  // (need to request mic permission first to get device labels)
  async function loadAudioDevices() {
    setDevicesLoading(true);
    try {
      // Request mic permission — required before enumerateDevices returns labels
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) =>
        s.getTracks().forEach((t) => t.stop())
      );
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      setAudioDevices(inputs);

      // Pre-select BlackHole if present, else default
      const blackhole = inputs.find((d) =>
        d.label.toLowerCase().includes("blackhole")
      );
      setSelectedDeviceId(blackhole?.deviceId ?? inputs[0]?.deviceId ?? "");
    } catch {
      setError("Microphone permission denied — needed to list audio devices.");
    } finally {
      setDevicesLoading(false);
    }
  }

  // Load devices when context is ready
  useEffect(() => {
    if (githubContext) loadAudioDevices();
  }, [githubContext]);

  async function handleGitHubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(
        `/api/github?username=${encodeURIComponent(username.trim())}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load GitHub data");
        return;
      }
      setGithubContext(data as GitHubContext);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  function handleStart() {
    if (githubContext) onReady(githubContext, selectedDeviceId);
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center"
      style={{ background: "var(--bg)" }}
    >
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div
            className="text-4xl font-bold tracking-tight mb-2"
            style={{ color: "var(--text)" }}
          >
            The Negotiator
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
            Real-time pitch coach for high-stakes meetings
          </div>
        </div>

        {/* Step 1: GitHub username */}
        {!githubContext ? (
          <form onSubmit={handleGitHubSubmit} className="space-y-4">
            <div>
              <label
                htmlFor="github"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted)" }}
              >
                GitHub Username
              </label>
              <input
                id="github"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. torvalds"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  color: "var(--text)",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--blue)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border)")
                }
                disabled={loading}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                Public repos — no token needed
              </p>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{
                  background: "rgba(255,68,68,0.1)",
                  color: "var(--red)",
                  border: "1px solid rgba(255,68,68,0.3)",
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all"
              style={{
                background:
                  loading || !username.trim()
                    ? "var(--border)"
                    : "var(--blue)",
                color:
                  loading || !username.trim() ? "var(--muted)" : "white",
                cursor:
                  loading || !username.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Loading GitHub context…" : "Load Context →"}
            </button>
          </form>
        ) : (
          /* Step 2: Audio device selection */
          <div className="space-y-4">
            {/* Confirmation of loaded context */}
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{
                background: "rgba(0,204,136,0.08)",
                border: "1px solid rgba(0,204,136,0.25)",
                color: "var(--green)",
              }}
            >
              ✓ GitHub context loaded for{" "}
              <strong>{githubContext.username}</strong> —{" "}
              {githubContext.repos.length} repos,{" "}
              {githubContext.topLanguages.join(", ")}
            </div>

            {/* Audio device selector */}
            <div>
              <label
                htmlFor="device"
                className="block text-sm font-medium mb-2"
                style={{ color: "var(--muted)" }}
              >
                Audio Input Device
              </label>
              {devicesLoading ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>
                  Loading devices…
                </p>
              ) : (
                <select
                  id="device"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    color: "var(--text)",
                  }}
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone (${d.deviceId.slice(0, 8)})`}
                      {d.label.toLowerCase().includes("blackhole")
                        ? " ← recommended"
                        : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                Select <strong>BlackHole 2ch</strong> to capture both sides of
                the call. Default mic = your voice only.
              </p>
            </div>

            {error && (
              <div
                className="px-4 py-3 rounded-lg text-sm"
                style={{
                  background: "rgba(255,68,68,0.1)",
                  color: "var(--red)",
                  border: "1px solid rgba(255,68,68,0.3)",
                }}
              >
                {error}
              </div>
            )}

            <button
              onClick={handleStart}
              disabled={devicesLoading}
              className="w-full py-3 rounded-lg font-semibold text-sm"
              style={{
                background: devicesLoading ? "var(--border)" : "var(--blue)",
                color: devicesLoading ? "var(--muted)" : "white",
                cursor: devicesLoading ? "not-allowed" : "pointer",
              }}
            >
              Start Meeting →
            </button>

            <button
              onClick={() => {
                setGithubContext(null);
                setError(null);
              }}
              className="w-full py-2 text-sm"
              style={{ color: "var(--muted)" }}
            >
              ← Change GitHub username
            </button>
          </div>
        )}

        <p className="text-center text-xs mt-6" style={{ color: "var(--muted)" }}>
          Chrome only · Requires Deepgram API key in .env.local
        </p>
      </div>
    </div>
  );
}
