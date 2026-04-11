import { NextRequest, NextResponse } from "next/server";
import { buildGitHubContext } from "@/lib/githubContext";

export async function GET(req: NextRequest) {
  const username = req.nextUrl.searchParams.get("username");

  if (!username || username.trim() === "") {
    return NextResponse.json({ error: "username is required" }, { status: 400 });
  }

  try {
    const context = await buildGitHubContext(username.trim());
    return NextResponse.json(context);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to fetch GitHub data";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
