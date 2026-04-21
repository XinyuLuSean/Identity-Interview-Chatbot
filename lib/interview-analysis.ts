import { generateSessionAnalysis } from "@/lib/ai/parser";
import { deriveFollowUpReasons } from "@/lib/domain/analysis";
import { getStorageAdapter } from "@/lib/storage";
import { getSessionById, upsertSession } from "@/lib/storage/repository";

export async function runDeferredInterviewAnalysis(sessionId: string) {
  const adapter = getStorageAdapter();
  const session = await getSessionById(adapter, sessionId);

  if (!session) {
    return;
  }

  if (
    session.status !== "completed" ||
    session.eligibilityResult !== "eligible" ||
    session.analysisGeneratedAt
  ) {
    return;
  }

  const analysis = await generateSessionAnalysis(session);
  await upsertSession(adapter, {
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
  });
}
