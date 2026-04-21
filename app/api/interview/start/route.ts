import { NextResponse } from "next/server";

import { createDraftInterviewSession } from "@/lib/interview-session";
import { clearParticipantSessionCookie, setParticipantSessionCookie } from "@/lib/participant-auth";
import { consumeRateLimit } from "@/lib/rate-limit";
import { getClientIp } from "@/lib/security";

export async function POST(request: Request) {
  const rateLimit = consumeRateLimit({
    bucket: "interview-start",
    key: getClientIp(request),
    limit: 12,
    windowMs: 10 * 60 * 1000,
  });

  if (!rateLimit.allowed) {
    return NextResponse.json(
      { error: "Too many new interview attempts. Please try again in a few minutes." },
      {
        status: 429,
        headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
      },
    );
  }

  const body = (await request.json().catch(() => ({}))) as { languageCode?: "en" | "es" };
  const session = createDraftInterviewSession(body.languageCode === "es" ? "es" : "en");
  await setParticipantSessionCookie(session);

  return NextResponse.json({ session });
}

export async function DELETE() {
  await clearParticipantSessionCookie();
  return NextResponse.json({ ok: true });
}
