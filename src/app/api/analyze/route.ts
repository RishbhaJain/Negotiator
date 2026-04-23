import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { GitHubContext } from "@/lib/githubContext";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface AnalyzeRequest {
  transcript: string;
  githubContext: GitHubContext;
}

export interface TalkingPoint {
  trigger: string;
  point: string;
  source: string;
  pinned?: boolean;
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

  const message = await anthropic.messages.create({
    model: "claude-haiku-4-5",
    max_tokens: 600,
    system:
      "You are a real-time pitch coach for high-stakes meetings (founders pitching VCs, PMs pitching stakeholders). " +
      "The transcript uses speaker labels: YOU = the founder/pitcher, THEM = the interviewer/VC. " +
      "Only analyze YOU lines for hedging and confidence scoring. " +
      "Use THEM lines (questions/comments) as context to generate relevant talking points from the founder's GitHub work. " +
      "Return ONLY valid JSON with these fields: " +
      "hedges (array of hedging phrases found in YOU lines only), " +
      "scoreDelta (integer based on YOU lines only: negative if weak, positive if confident, range -20 to +10), " +
      "talkingPoints (array of 1-2 objects with trigger, point, source fields — " +
      "grounded in their actual GitHub work, triggered by THEM questions, specific and actionable, max 25 words each).",
    messages: [
      {
        role: "user",
        content:
          `GitHub context: ${JSON.stringify(contextSummary)}\n\n` +
          `Recent transcript (YOU = founder, THEM = VC/interviewer):\n${transcript}\n\n` +
          `Return JSON: { "hedges": string[], "scoreDelta": number, "talkingPoints": [{"trigger": string, "point": string, "source": string}] }`,
      },
    ],
  });

  const raw =
    message.content[0].type === "text" ? message.content[0].text : "{}";

  let parsed: AnalyzeResponse;
  try {
    // Extract the first {...} block — handles code fences, preamble text, etc.
    const match = raw.match(/\{[\s\S]*\}/);
    parsed = match ? JSON.parse(match[0]) : { hedges: [], scoreDelta: 0, talkingPoints: [] };
  } catch (e) {
    console.error("analyze: JSON parse failed", e, "raw:", raw);
    parsed = { hedges: [], scoreDelta: 0, talkingPoints: [] };
  }

  return NextResponse.json<AnalyzeResponse>(parsed);
}
