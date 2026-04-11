export interface GitHubRepo {
  name: string;
  description: string;
  language: string;
  stars: number;
  recentCommits: string[];
  readmeSnippet: string;
  url: string;
}

export interface GitHubContext {
  username: string;
  repos: GitHubRepo[];
  topLanguages: string[];
  totalStars: number;
  recentActivity: string;
}

async function fetchJson(url: string) {
  const res = await fetch(url, {
    headers: { Accept: "application/vnd.github.v3+json" },
    next: { revalidate: 0 },
  });
  if (!res.ok) throw new Error(`GitHub API error: ${res.status} ${url}`);
  return res.json();
}

export async function buildGitHubContext(username: string): Promise<GitHubContext> {
  // Fetch top 5 most recently updated public repos
  const repos = await fetchJson(
    `https://api.github.com/users/${username}/repos?sort=updated&per_page=5&type=public`
  );

  const repoDetails: GitHubRepo[] = await Promise.all(
    repos.map(async (repo: { name: string; description: string; language: string; stargazers_count: number; html_url: string }) => {
      const [commits, readmeRes] = await Promise.allSettled([
        fetchJson(`https://api.github.com/repos/${username}/${repo.name}/commits?per_page=3`),
        fetchJson(`https://api.github.com/repos/${username}/${repo.name}/readme`),
      ]);

      const recentCommits =
        commits.status === "fulfilled"
          ? (commits.value as { commit: { message: string } }[]).map((c) =>
              c.commit.message.split("\n")[0].slice(0, 80)
            )
          : [];

      let readmeSnippet = "";
      if (readmeRes.status === "fulfilled" && readmeRes.value.content) {
        const decoded = Buffer.from(readmeRes.value.content, "base64").toString("utf-8");
        readmeSnippet = decoded.replace(/[#*`\[\]]/g, "").slice(0, 300).trim();
      }

      return {
        name: repo.name,
        description: repo.description ?? "",
        language: repo.language ?? "Unknown",
        stars: repo.stargazers_count,
        recentCommits,
        readmeSnippet,
        url: repo.html_url,
      };
    })
  );

  // Aggregate top languages
  const langCounts: Record<string, number> = {};
  for (const r of repoDetails) {
    if (r.language && r.language !== "Unknown") {
      langCounts[r.language] = (langCounts[r.language] ?? 0) + 1;
    }
  }
  const topLanguages = Object.entries(langCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4)
    .map(([lang]) => lang);

  const totalStars = repoDetails.reduce((sum, r) => sum + r.stars, 0);

  const activeRepos = repoDetails.filter((r) => r.recentCommits.length > 0).length;
  const recentActivity =
    activeRepos > 0
      ? `Active across ${activeRepos} repo${activeRepos > 1 ? "s" : ""} recently`
      : "Public repos loaded";

  return { username, repos: repoDetails, topLanguages, totalStars, recentActivity };
}
