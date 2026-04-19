import { NextResponse } from "next/server";

import { advanceSession, getSession } from "@/lib/session-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function GET(_: Request, context: RouteContext) {
  const { sessionId } = await context.params;
  const session = await getSession(sessionId);

  if (!session) {
    return NextResponse.json({ error: "Session not found." }, { status: 404 });
  }

  return NextResponse.json({ session });
}

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { sessionId } = await context.params;
    const body = await request.json();
    const session = await advanceSession(sessionId, body);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update session.",
      },
      { status: 400 },
    );
  }
}

