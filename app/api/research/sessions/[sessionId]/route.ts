import { NextResponse } from "next/server";

import { isResearcherAuthorized } from "@/lib/research-auth";
import { updateResearchSession } from "@/lib/session-service";

type RouteContext = {
  params: Promise<{ sessionId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const isAuthed = await isResearcherAuthorized();
    if (!isAuthed) {
      return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
    }

    const { sessionId } = await context.params;
    const body = await request.json();
    const session = await updateResearchSession(sessionId, body);
    return NextResponse.json({ session });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to update review record.",
      },
      { status: 400 },
    );
  }
}
