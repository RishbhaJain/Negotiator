import { NextResponse } from "next/server";

export async function GET() {
  const key = process.env.DEEPGRAM_API_KEY;
  if (!key) {
    return NextResponse.json(
      { error: "DEEPGRAM_API_KEY not set in .env.local" },
      { status: 500 }
    );
  }
  return NextResponse.json({ key });
}
