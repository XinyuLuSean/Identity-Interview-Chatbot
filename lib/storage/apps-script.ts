import { buildSummaryRecords } from "@/lib/domain/analysis";
import {
  InterviewSessionSchema,
  ResearchDatasetSchema,
  type InterviewSession,
  type ResearchDataset,
} from "@/lib/domain/schemas";
import type { StorageAdapter } from "@/lib/storage/repository";

type AppsScriptSuccess =
  | {
      ok: true;
      dataset: ResearchDataset;
    }
  | {
      ok: true;
      session: InterviewSession | null;
    };

type AppsScriptFailure = {
  ok: false;
  error?: string;
};

type AppsScriptResponse = AppsScriptSuccess | AppsScriptFailure;

function getAppsScriptError(
  result: AppsScriptResponse,
  fallback: string,
) {
  return !result.ok ? result.error || fallback : fallback;
}

function getAppsScriptConfig() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (!url) {
    throw new Error("GOOGLE_APPS_SCRIPT_URL is not configured.");
  }

  if (!secret) {
    throw new Error("GOOGLE_APPS_SCRIPT_SECRET is not configured.");
  }

  return { url, secret };
}

async function callAppsScript(
  payload: Record<string, unknown>,
): Promise<AppsScriptResponse> {
  const { url, secret } = getAppsScriptConfig();

  const response = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      ...payload,
      secret,
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Apps Script request failed with status ${response.status}.`);
  }

  return (await response.json()) as AppsScriptResponse;
}

export class AppsScriptStorageAdapter implements StorageAdapter {
  async readDataset(): Promise<ResearchDataset> {
    const result = await callAppsScript({ action: "read_dataset" });

    if (!result.ok || !("dataset" in result)) {
      throw new Error(getAppsScriptError(result, "Apps Script dataset read failed."));
    }

    const dataset = ResearchDatasetSchema.parse(result.dataset);
    return {
      ...dataset,
      summaryRecords: buildSummaryRecords(dataset.sessions),
    };
  }

  async writeDataset(_: ResearchDataset): Promise<void> {
    throw new Error(
      "Apps Script storage uses atomic session writes only; full dataset writes are disabled.",
    );
  }

  async getSessionById(sessionId: string): Promise<InterviewSession | null> {
    const result = await callAppsScript({
      action: "get_session",
      sessionId,
    });

    if (!result.ok || !("session" in result)) {
      throw new Error(getAppsScriptError(result, "Apps Script session read failed."));
    }

    return result.session ? InterviewSessionSchema.parse(result.session) : null;
  }

  async upsertSession(session: InterviewSession): Promise<InterviewSession> {
    const validatedSession = InterviewSessionSchema.parse(session);
    const result = await callAppsScript({
      action: "upsert_session",
      session: validatedSession,
    });

    if (!result.ok || !("session" in result) || !result.session) {
      throw new Error(getAppsScriptError(result, "Apps Script session write failed."));
    }

    return InterviewSessionSchema.parse(result.session);
  }
}
