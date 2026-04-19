import { AppsScriptStorageAdapter } from "@/lib/storage/apps-script";
import { GoogleSheetsStorageAdapter } from "@/lib/storage/google-sheets";
import { LocalFileStorageAdapter } from "@/lib/storage/local-file";
import type { StorageAdapter } from "@/lib/storage/repository";

let adapter: StorageAdapter | null = null;

export function getStorageAdapter(): StorageAdapter {
  if (adapter) {
    return adapter;
  }

  if (process.env.STORAGE_BACKEND === "apps_script") {
    adapter = new AppsScriptStorageAdapter();
    return adapter;
  }

  if (process.env.STORAGE_BACKEND === "google") {
    adapter = new GoogleSheetsStorageAdapter();
    return adapter;
  }

  adapter = new LocalFileStorageAdapter();
  return adapter;
}
