import { mkdirSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
import { DATA_FILES } from "../defaults";

export function getPersistentDataDir(): string {
  const base =
    process.env.EIDOLON_DATA_DIR ||
    (process.platform === "win32"
      ? join(
          process.env.LOCALAPPDATA || join(homedir(), "AppData", "Local"),
          DATA_FILES.directoryName,
          "data",
        )
      : join(process.env.HOME || homedir(), `.${DATA_FILES.directoryName}`, "data"));

  mkdirSync(base, { recursive: true });
  return base;
}

export const SQLITE_DB_PATH: string = join(getPersistentDataDir(), DATA_FILES.sqlite);

export const LANCEDB_DIR_PATH: string = join(getPersistentDataDir(), DATA_FILES.lancedb);

export function getPublicAssetDir(): string {
  return process.env.EIDOLON_PUBLIC_DIR || join(process.cwd(), "..", "..", "public");
}
