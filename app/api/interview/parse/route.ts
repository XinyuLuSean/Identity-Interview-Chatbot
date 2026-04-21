import { NextResponse } from "next/server";

import { parseRankedSources } from "@/lib/ai/parser";
import { getParticipantSessionToken } from "@/lib/participant-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const participantSession = await getParticipantSessionToken();
    if (!participantSession) {
      return NextResponse.json(
        { error: "Your interview session has expired. Please start again." },
        { status: 401 },
      );
    }

    const rateLimit = consumeRateLimit({
      bucket: "interview-parse",
      key: `${getClientIp(request)}:${participantSession.sessionId}`,
      limit: 10,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many parsing attempts. Please try again shortly." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = (await request.json()) as { input?: string };
    const input = body.input?.trim() ?? "";

    if (input.length < 10) {
      return NextResponse.json(
        { error: "Please provide a more complete identity response." },
        { status: 400 },
      );
    }

    if (input.length > 4000) {
      return NextResponse.json(
        { error: "Please keep the identity response under 4,000 characters." },
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
