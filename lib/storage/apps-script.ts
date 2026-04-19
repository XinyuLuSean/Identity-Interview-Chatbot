import { buildSummaryRecords } from "@/lib/domain/analysis";
import { ResearchDatasetSchema, type ResearchDataset } from "@/lib/domain/schemas";
import type { StorageAdapter } from "@/lib/storage/repository";

type AppsScriptResponse =
  | {
      ok: true;
      dataset: ResearchDataset;
    }
  | {
      ok: false;
      error?: string;
    };

function getAppsScriptConfig() {
  const url = process.env.GOOGLE_APPS_SCRIPT_URL;
  const secret = process.env.GOOGLE_APPS_SCRIPT_SECRET;

  if (!url) {
    throw new Error("GOOGLE_APPS_SCRIPT_URL is not configured.");
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
    const result = await callAppsScript({ action: "read" });

    if (!result.ok) {
      throw new Error(result.error || "Apps Script read failed.");
    }

    const dataset = ResearchDatasetSchema.parse(result.dataset);
    return {
      ...dataset,
      summaryRecords: buildSummaryRecords(dataset.sessions),
    };
  }

  async writeDataset(dataset: ResearchDataset): Promise<void> {
    const result = await callAppsScript({
      action: "write",
      dataset: {
        ...dataset,
        summaryRecords: buildSummaryRecords(dataset.sessions),
      },
    });

    if (!result.ok) {
      throw new Error(result.error || "Apps Script write failed.");
    }
  }
}
