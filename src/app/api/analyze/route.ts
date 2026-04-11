import { NextRequest, NextResponse } from "next/server";
import OpenAI from "openai";
import { GitHubContext } from "@/lib/githubContext";

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export interface AnalyzeRequest {
  transcript: string;
  githubContext: GitHubContext;
}

export interface TalkingPoint {
  trigger: string;
  point: string;
  source: string;
}

export interface AnalyzeResponse {
  hedges: string[];
  scoreDelta: number;
  talkingPoints: TalkingPoint[];
}

export async function POST(req: NextRequest) {
  const body: AnalyzeRequest = await req.json();
  const { transcript, githubContext } = body;

  if (!transcript || transcript.trim().length < 10) {
    return NextResponse.json<AnalyzeResponse>({
      hedges: [],
      scoreDelta: 0,
      talkingPoints: [],
    });
  }

  // Build a compact context summary to keep tokens low
  const contextSummary = {
    username: githubContext.username,
    topLanguages: githubContext.topLanguages,
    totalStars: githubContext.totalStars,
    recentActivity: githubContext.recentActivity,
    repos: githubContext.repos.map((r) => ({
      name: r.name,
      description: r.description,
      language: r.language,
      stars: r.stars,
      recentCommits: r.recentCommits.slice(0, 2),
    })),
  };

  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    response_format: { type: "json_object" },
    max_tokens: 400,
    messages: [
      {
        role: "system",
        content:
          "You are a real-time pitch coach for high-stakes meetings (founders pitching VCs, PMs pitching stakeholders). " +
          "Analyze the speaker's recent transcript for confidence and self-advocacy. " +
          "Return ONLY valid JSON with these fields: " +
          "hedges (array of hedging phrases found), " +
          "scoreDelta (integer: negative if weak, positive if confident, range -20 to +10), " +
          "talkingPoints (array of 1-2 objects with trigger, point, source fields — " +
          "grounded in their actual GitHub work, specific and actionable, max 25 words each).",
      },
      {
        role: "user",
        content:
          `GitHub context: ${JSON.stringify(contextSummary)}\n\n` +
          `Recent transcript (last ~15 seconds): "${transcript}"\n\n` +
          `Return JSON: { "hedges": string[], "scoreDelta": number, "talkingPoints": [{"trigger": string, "point": string, "source": string}] }`,
      },
    ],
  });

  const raw = completion.choices[0].message.content ?? "{}";

  let parsed: AnalyzeResponse;
  try {
    parsed = JSON.parse(raw);
  } catch {
    parsed = { hedges: [], scoreDelta: 0, talkingPoints: [] };
  }

  return NextResponse.json<AnalyzeResponse>(parsed);
}
