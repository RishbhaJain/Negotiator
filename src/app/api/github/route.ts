import { NextRequest, NextResponse } from "next/server";
import { buildGitHubContext } from "@/lib/githubContext";

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${url}`);
  return res.json();
}

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");
  const listOnly = req.nextUrl.searchParams.get("list") === "true";
  const reposParam = req.nextUrl.searchParams.get("repos");

  if (!username || username.trim() === "") {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  try {
    // Lightweight list mode — just return repo names + descriptions for the picker
    if (listOnly) {
      const repos = await fetchJson(
        `https://api.github.com/users/${username.trim()}/repos?sort=updated&per_page=20&type=public`
      );
      return NextResponse.json(
        repos.map((r: { name: string; description: string; language: string; stargazers_count: number }) => ({
          name: r.name,
          description: r.description ?? "",
          language: r.language ?? "Unknown",
          stars: r.stargazers_count,
        }))
      );
    }

    const selectedRepos = reposParam ? reposParam.split(",").map((s) => s.trim()).filter(Boolean) : undefined;
    const context = await buildGitHubContext(username.trim(), selectedRepos);
    return NextResponse.json(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch GitHub data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
