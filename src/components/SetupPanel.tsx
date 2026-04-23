"use client";

import { useState, useEffect } from "react";
import { GitHubContext } from "@/lib/githubContext";

interface RepoListItem {
  name: string;
  description: string;
  language: string;
  stars: number;
}

interface Props {
  onReady: (context: GitHubContext, deviceId: string) => void;
}

export default function SetupPanel({ onReady }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Step 2: repo picker
  const [repoList, setRepoList] = useState<RepoListItem[] | null>(null);
  const [selectedRepos, setSelectedRepos] = useState<Set<string>>(new Set());
  const [contextLoading, setContextLoading] = useState(false);

  // Step 3: audio
  const [githubContext, setGithubContext] = useState<GitHubContext | null>(null);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>("");
  const [devicesLoading, setDevicesLoading] = useState(false);

  async function loadAudioDevices() {
    setDevicesLoading(true);
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true }).then((s) =>
        s.getTracks().forEach((t) => t.stop())
      );
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      setAudioDevices(inputs);
      const blackhole = inputs.find((d) => d.label.toLowerCase().includes("blackhole"));
      setSelectedDeviceId(blackhole?.deviceId ?? inputs[0]?.deviceId ?? "");
    } catch {
      setError("Microphone permission denied — needed to list audio devices.");
    } finally {
      setDevicesLoading(false);
    }
  }

  useEffect(() => {
    if (githubContext) loadAudioDevices();
  }, [githubContext]);

  // Step 1: fetch lightweight repo list
  async function handleGitHubSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(username.trim())}&list=true`);
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load GitHub repos");
        return;
      }
      setRepoList(data as RepoListItem[]);
      // Default: select top 3
      setSelectedRepos(new Set((data as RepoListItem[]).slice(0, 3).map((r) => r.name)));
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  function toggleRepo(name: string) {
    setSelectedRepos((prev) => {
      const next = new Set(prev);
      if (next.has(name)) next.delete(name);
      else next.add(name);
      return next;
    });
  }

  // Step 2 → 3: load full context for selected repos
  async function handleLoadContext() {
    if (selectedRepos.size === 0) return;
    setContextLoading(true);
    setError(null);
    try {
      const reposParam = Array.from(selectedRepos).join(",");
      const res = await fetch(
        `/api/github?username=${encodeURIComponent(username.trim())}&repos=${encodeURIComponent(reposParam)}`
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed to load GitHub context");
        return;
      }
      setGithubContext(data as GitHubContext);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setContextLoading(false);
    }
  }

  function handleStart() {
    if (githubContext) onReady(githubContext, selectedDeviceId);
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md px-6">
        <div className="text-center mb-10">
          <div className="text-4xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>
            The Negotiator
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
            Real-time pitch coach for high-stakes meetings
          </div>
        </div>

        {/* Step 1: GitHub username */}
        {!repoList && (
          <form onSubmit={handleGitHubSubmit} className="space-y-4">
            <div>
              <label htmlFor="github" className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
                GitHub Username
              </label>
              <input
                id="github"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. torvalds"
                className="w-full px-4 py-3 rounded-lg text-sm outline-none transition-all"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                onFocus={(e) => (e.target.style.borderColor = "var(--blue)")}
                onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
                disabled={loading}
              />
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>Public repos — no token needed</p>
            </div>
            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(255,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(255,68,68,0.3)" }}>
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={loading || !username.trim()}
              className="w-full py-3 rounded-lg font-semibold text-sm transition-all"
              style={{
                background: loading || !username.trim() ? "var(--border)" : "var(--blue)",
                color: loading || !username.trim() ? "var(--muted)" : "white",
                cursor: loading || !username.trim() ? "not-allowed" : "pointer",
              }}
            >
              {loading ? "Loading repos…" : "Continue →"}
            </button>
          </form>
        )}

        {/* Step 2: Repo picker */}
        {repoList && !githubContext && (
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-3" style={{ color: "var(--muted)" }}>
                Pick repos to load as context
              </p>
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {repoList.map((repo) => {
                  const checked = selectedRepos.has(repo.name);
                  return (
                    <label
                      key={repo.name}
                      className="flex items-start gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all"
                      style={{
                        background: checked ? "rgba(68,136,255,0.08)" : "var(--surface)",
                        border: `1px solid ${checked ? "rgba(68,136,255,0.3)" : "var(--border)"}`,
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleRepo(repo.name)}
                        className="mt-0.5 flex-shrink-0"
                        style={{ accentColor: "var(--blue)" }}
                      />
                      <div className="min-w-0">
                        <div className="text-sm font-medium" style={{ color: "var(--text)" }}>
                          {repo.name}
                          {repo.language && (
                            <span className="ml-2 text-xs font-normal" style={{ color: "var(--muted)" }}>
                              {repo.language}
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <div className="text-xs mt-0.5 truncate" style={{ color: "var(--muted)" }}>
                            {repo.description}
                          </div>
                        )}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(255,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(255,68,68,0.3)" }}>
                {error}
              </div>
            )}

            <button
              onClick={handleLoadContext}
              disabled={contextLoading || selectedRepos.size === 0}
              className="w-full py-3 rounded-lg font-semibold text-sm"
              style={{
                background: contextLoading || selectedRepos.size === 0 ? "var(--border)" : "var(--blue)",
                color: contextLoading || selectedRepos.size === 0 ? "var(--muted)" : "white",
                cursor: contextLoading || selectedRepos.size === 0 ? "not-allowed" : "pointer",
              }}
            >
              {contextLoading
                ? "Loading context…"
                : `Load ${selectedRepos.size} repo${selectedRepos.size !== 1 ? "s" : ""} →`}
            </button>

            <button
              onClick={() => { setRepoList(null); setError(null); }}
              className="w-full py-2 text-sm"
              style={{ color: "var(--muted)" }}
            >
              ← Change username
            </button>
          </div>
        )}

        {/* Step 3: Audio device */}
        {githubContext && (
          <div className="space-y-4">
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(0,204,136,0.08)", border: "1px solid rgba(0,204,136,0.25)", color: "var(--green)" }}
            >
              ✓ Context loaded for <strong>{githubContext.username}</strong> —{" "}
              {githubContext.repos.length} repo{githubContext.repos.length !== 1 ? "s" : ""}
            </div>

            <div>
              <label htmlFor="device" className="block text-sm font-medium mb-2" style={{ color: "var(--muted)" }}>
                Audio Input Device
              </label>
              {devicesLoading ? (
                <p className="text-sm" style={{ color: "var(--muted)" }}>Loading devices…</p>
              ) : (
                <select
                  id="device"
                  value={selectedDeviceId}
                  onChange={(e) => setSelectedDeviceId(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg text-sm outline-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                >
                  {audioDevices.map((d) => (
                    <option key={d.deviceId} value={d.deviceId}>
                      {d.label || `Microphone (${d.deviceId.slice(0, 8)})`}
                      {d.label.toLowerCase().includes("blackhole") ? " ← recommended" : ""}
                    </option>
                  ))}
                </select>
              )}
              <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
                Select <strong>BlackHole 2ch</strong> to capture both sides of the call.
              </p>
            </div>

            {error && (
              <div className="px-4 py-3 rounded-lg text-sm" style={{ background: "rgba(255,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(255,68,68,0.3)" }}>
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
              onClick={() => { setGithubContext(null); setError(null); }}
              className="w-full py-2 text-sm"
              style={{ color: "var(--muted)" }}
            >
              ← Change repos
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
