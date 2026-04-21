import { NextResponse } from "next/server";

import { parseRankedSources } from "@/lib/ai/parser";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim() ?? "";

    if (input.length < 10) {
      return NextResponse.json(
        { error: "Please provide a more complete identity response." },
        { status: 400 },
      );
    }

    const parsed = await parseRankedSources(input);
    return NextResponse.json(parsed);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to parse identity response.",
      },
      { status: 400 },
    );
  }
}
