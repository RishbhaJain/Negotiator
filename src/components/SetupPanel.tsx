"use client";

import { useState } from "react";
import { GitHubContext } from "@/lib/githubContext";

interface Props {
  onReady: (context: GitHubContext) => void;
}

export default function SetupPanel({ onReady }: Props) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!username.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`/api/github?username=${encodeURIComponent(username.trim())}`);
      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to load GitHub data");
        return;
      }

      onReady(data as GitHubContext);
    } catch {
      setError("Network error — check your connection");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--bg)" }}>
      <div className="w-full max-w-md px-6">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="text-4xl font-bold tracking-tight mb-2" style={{ color: "var(--text)" }}>
            The Negotiator
          </div>
          <div style={{ color: "var(--muted)", fontSize: "0.95rem" }}>
            Real-time pitch coach for high-stakes meetings
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
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
              onFocus={(e) => (e.target.style.borderColor = "var(--blue)")}
              onBlur={(e) => (e.target.style.borderColor = "var(--border)")}
              disabled={loading}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--muted)" }}>
              Public repos only — no token needed
            </p>
          </div>

          {error && (
            <div
              className="px-4 py-3 rounded-lg text-sm"
              style={{ background: "rgba(255,68,68,0.1)", color: "var(--red)", border: "1px solid rgba(255,68,68,0.3)" }}
            >
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
            {loading ? "Loading GitHub context…" : "Load Context & Start"}
          </button>
        </form>

        <p className="text-center text-xs mt-6" style={{ color: "var(--muted)" }}>
          Chrome only · Requires mic permission
        </p>
      </div>
    </div>
  );
}
