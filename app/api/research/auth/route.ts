import { NextResponse } from "next/server";

import { consumeRateLimit } from "@/lib/rate-limit";
import { getResearcherAccessCode, setResearcherAuthorized } from "@/lib/research-auth";
import { getClientIp, timingSafeEqualString } from "@/lib/security";

export async function POST(request: Request) {
  try {
    const rateLimit = consumeRateLimit({
      bucket: "research-auth",
      key: getClientIp(request),
      limit: 8,
      windowMs: 10 * 60 * 1000,
    });

    if (!rateLimit.allowed) {
      return NextResponse.json(
        { error: "Too many access attempts. Please try again later." },
        {
          status: 429,
          headers: { "Retry-After": String(rateLimit.retryAfterSeconds) },
        },
      );
    }

    const body = (await request.json().catch(() => ({}))) as { code?: string };
    const accessCode = getResearcherAccessCode();

    if (!body.code || !timingSafeEqualString(body.code, accessCode)) {
      return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
    }

    await setResearcherAuthorized();
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Researcher access is unavailable.",
      },
      { status: 500 },
    );
  }
}
