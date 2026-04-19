import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { buildSummaryRecords } from "@/lib/domain/analysis";
import { ResearchDatasetSchema, type ResearchDataset } from "@/lib/domain/schemas";
import type { StorageAdapter } from "@/lib/storage/repository";

const DATA_DIRECTORY = path.join(process.cwd(), "data");
const DATA_FILE = path.join(DATA_DIRECTORY, "research-dataset.json");

const EMPTY_DATASET: ResearchDataset = {
  sessions: [],
  generatedAt: new Date().toISOString(),
  summaryRecords: [],
};

export class LocalFileStorageAdapter implements StorageAdapter {
  async readDataset(): Promise<ResearchDataset> {
    await mkdir(DATA_DIRECTORY, { recursive: true });

    try {
      const raw = await readFile(DATA_FILE, "utf8");
      const parsed = ResearchDatasetSchema.parse(JSON.parse(raw));
      return {
        ...parsed,
        summaryRecords: buildSummaryRecords(parsed.sessions),
      };
    } catch {
      return EMPTY_DATASET;
    }
  }

  async writeDataset(dataset: ResearchDataset): Promise<void> {
    await mkdir(DATA_DIRECTORY, { recursive: true });
    await writeFile(DATA_FILE, JSON.stringify(dataset, null, 2), "utf8");
  }
}

