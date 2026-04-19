import { NextResponse } from "next/server";

import { createSession } from "@/lib/session-service";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => ({}))) as {
    languageCode?: "en" | "es";
  };

  const session = await createSession(body.languageCode ?? "en");
  return NextResponse.json({ session });
}

