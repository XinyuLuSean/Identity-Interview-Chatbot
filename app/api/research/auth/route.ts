import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { getResearcherAccessCode, RESEARCHER_ACCESS_COOKIE } from "@/lib/research-auth";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as { code?: string };

  if (!body.code || body.code !== getResearcherAccessCode()) {
    return NextResponse.json({ error: "Invalid access code." }, { status: 401 });
  }

  const cookieStore = await cookies();
  cookieStore.set(RESEARCHER_ACCESS_COOKIE, body.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });

  return NextResponse.json({ ok: true });
}

