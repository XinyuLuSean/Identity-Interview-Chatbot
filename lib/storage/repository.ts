import { buildSummaryRecords } from "@/lib/domain/analysis";
import {
  InterviewSessionSchema,
  ResearchDatasetSchema,
  type InterviewSession,
  type ResearchDataset,
} from "@/lib/domain/schemas";

export interface StorageAdapter {
  readDataset(): Promise<ResearchDataset>;
  writeDataset(dataset: ResearchDataset): Promise<void>;
  getSessionById?(sessionId: string): Promise<InterviewSession | null>;
  upsertSession?(session: InterviewSession): Promise<InterviewSession>;
}

export async function getDataset(adapter: StorageAdapter) {
  const dataset = await adapter.readDataset();
  return ResearchDatasetSchema.parse({
    ...dataset,
    generatedAt: dataset.generatedAt ?? new Date().toISOString(),
    summaryRecords: buildSummaryRecords(dataset.sessions),
  });
}

export async function getSessionById(
  adapter: StorageAdapter,
  sessionId: string,
): Promise<InterviewSession | null> {
  if (adapter.getSessionById) {
    return adapter.getSessionById(sessionId);
  }

  const dataset = await getDataset(adapter);
  return dataset.sessions.find((session) => session.sessionId === sessionId) ?? null;
}

export async function upsertSession(
  adapter: StorageAdapter,
  session: InterviewSession,
): Promise<InterviewSession> {
  if (adapter.upsertSession) {
    return adapter.upsertSession(session);
  }

  const dataset = await getDataset(adapter);
  const validatedSession = InterviewSessionSchema.parse(session);
  const existingIndex = dataset.sessions.findIndex(
    (entry) => entry.sessionId === validatedSession.sessionId,
  );

  if (existingIndex >= 0) {
    dataset.sessions[existingIndex] = validatedSession;
  } else {
    dataset.sessions.unshift(validatedSession);
  }

  dataset.generatedAt = new Date().toISOString();
  dataset.summaryRecords = buildSummaryRecords(dataset.sessions);

  await adapter.writeDataset(dataset);
  return validatedSession;
}
