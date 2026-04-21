import { describe, expect, it, vi } from "vitest";

import {
  getSessionById,
  upsertSession,
  type StorageAdapter,
} from "@/lib/storage/repository";
import type { InterviewSession, ResearchDataset } from "@/lib/domain/schemas";

function createSession(sessionId: string): InterviewSession {
  return {
    sessionId,
    subjectId: "subject-1",
    status: "active",
    eligibilityResult: "unknown",
    currentStep: "intro",
    languageCode: "en",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    completedAt: null,
    clarificationUsed: false,
    identityResponse: null,
    rankedSourcesRawInput: null,
    rankedSourcesDraft: [],
    parserConfidence: null,
    parserWarnings: [],
    transcript: [],
    structuredRecord: null,
    participantKey: null,
    codingRecords: [],
    followUpReasons: [],
    analysisSummary: null,
    analysisGeneratedAt: null,
  };
}

function createDataset(): ResearchDataset {
  return {
    sessions: [createSession("session-1")],
    generatedAt: new Date().toISOString(),
    summaryRecords: [],
  };
}

describe("storage repository atomic hooks", () => {
  it("uses adapter.getSessionById when available", async () => {
    const getSessionByIdMock = vi.fn().mockResolvedValue(createSession("session-1"));
    const adapter: StorageAdapter = {
      readDataset: vi.fn(async () => createDataset()),
      writeDataset: vi.fn(async () => undefined),
      getSessionById: getSessionByIdMock,
    };

    const session = await getSessionById(adapter, "session-1");

    expect(getSessionByIdMock).toHaveBeenCalledWith("session-1");
    expect(session?.sessionId).toBe("session-1");
  });

  it("uses adapter.upsertSession when available", async () => {
    const session = createSession("session-2");
    const upsertSessionMock = vi.fn().mockResolvedValue(session);
    const adapter: StorageAdapter = {
      readDataset: vi.fn(async () => createDataset()),
      writeDataset: vi.fn(async () => undefined),
      upsertSession: upsertSessionMock,
    };

    const result = await upsertSession(adapter, session);

    expect(upsertSessionMock).toHaveBeenCalledWith(session);
    expect(result.sessionId).toBe("session-2");
  });
});
