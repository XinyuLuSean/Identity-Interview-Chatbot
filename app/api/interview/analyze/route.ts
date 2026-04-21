import { NextResponse } from "next/server";

import { generateSessionAnalysis } from "@/lib/ai/parser";
import { deriveFollowUpReasons } from "@/lib/domain/analysis";
import { getStorageAdapter } from "@/lib/storage";
import { getSessionById, upsertSession } from "@/lib/storage/repository";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { sessionId?: string };
    const sessionId = body.sessionId?.trim();

    if (!sessionId) {
      return NextResponse.json({ error: "sessionId is required." }, { status: 400 });
    }

    const adapter = getStorageAdapter();
    const session = await getSessionById(adapter, sessionId);

    if (!session) {
      return NextResponse.json({ error: "Session not found." }, { status: 404 });
    }

    if (session.status !== "completed" || session.eligibilityResult !== "eligible") {
      return NextResponse.json({ skipped: true, reason: "Session is not eligible for analysis." });
    }

    const analysis = await generateSessionAnalysis(session);
    const updatedSession = {
      ...session,
      codingRecords: analysis.codingRecords,
      followUpReasons: deriveFollowUpReasons(
        analysis.codingRecords,
        session.parserConfidence,
        session.rankedSourcesDraft.length,
      ),
      analysisSummary: analysis.summary,
      analysisGeneratedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await upsertSession(adapter, updatedSession);
    return NextResponse.json({ session: saved });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unable to analyze interview.",
      },
      { status: 400 },
    );
  }
}
