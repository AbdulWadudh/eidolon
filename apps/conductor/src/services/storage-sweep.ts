import { ListObjectsV2Command } from "@aws-sdk/client-s3";
import { STORAGE_SWEEP } from "@/config";
import { db } from "@/db";
import { deleteFile, getS3Client, getStorageConfig, isStorageConnected } from "@/services/storage";

export interface StoredObject {
  key: string;
  bytes: number;
  modifiedAt: number;
}

export interface SweepReport {
  scanned: number;
  referenced: number;
  orphans: StoredObject[];
  removed: string[];
  freedBytes: number;
  skipped: "not-connected" | "no-references" | null;
}

export function storedKey(reference: string | null, bucket: string): string | null {
  if (!reference) return null;

  const path = reference.split("?")[0].trim();
  if (path.length === 0) return null;

  const marker = `/${bucket}/`;
  const at = path.indexOf(marker);
  if (at >= 0) return decodeURIComponent(path.slice(at + marker.length));

  return /^https?:\/\//i.test(path) ? null : decodeURIComponent(path.replace(/^\/+/, ""));
}

export function referencedKeys(bucket: string): Set<string> {
  const keys = new Set<string>();

  for (const source of STORAGE_SWEEP.sources) {
    for (const column of source.columns) {
      let rows: { value: string | null }[];
      try {
        rows = db
          .query<{ value: string | null }, []>(
            `SELECT "${column}" as value FROM "${source.table}" WHERE "${column}" IS NOT NULL`,
          )
          .all();
      } catch {
        continue;
      }

      for (const row of rows) {
        const key = storedKey(row.value, bucket);
        if (key) keys.add(key);
      }
    }
  }

  return keys;
}

export async function listStoredObjects(): Promise<StoredObject[]> {
  const bucket = getStorageConfig().bucket;
  const s3 = getS3Client();
  const found: StoredObject[] = [];
  let token: string | undefined;

  do {
    const page = await s3.send(
      new ListObjectsV2Command({
        Bucket: bucket,
        MaxKeys: STORAGE_SWEEP.pageSize,
        ContinuationToken: token,
      }),
    );

    for (const object of page.Contents ?? []) {
      if (!object.Key) continue;
      found.push({
        key: object.Key,
        bytes: object.Size ?? 0,
        modifiedAt: object.LastModified?.getTime() ?? 0,
      });
    }

    token = page.NextContinuationToken;
  } while (token);

  return found;
}

export async function sweepStorage(options: { dryRun?: boolean } = {}): Promise<SweepReport> {
  const empty: SweepReport = {
    scanned: 0,
    referenced: 0,
    orphans: [],
    removed: [],
    freedBytes: 0,
    skipped: null,
  };

  if (!isStorageConnected()) return { ...empty, skipped: "not-connected" };

  const bucket = getStorageConfig().bucket;
  const stored = await listStoredObjects();
  const keys = referencedKeys(bucket);

  if (keys.size === 0 && stored.length > 0) {
    console.error("[Storage] Sweep refused: the bucket holds objects but the library named none.");
    return { ...empty, scanned: stored.length, skipped: "no-references" };
  }

  const settled = Date.now() - STORAGE_SWEEP.graceMs;
  const orphans = stored.filter(
    (object) => !keys.has(object.key) && object.modifiedAt > 0 && object.modifiedAt < settled,
  );

  const report: SweepReport = {
    scanned: stored.length,
    referenced: keys.size,
    orphans,
    removed: [],
    freedBytes: 0,
    skipped: null,
  };

  if (options.dryRun) return report;

  for (const object of orphans) {
    try {
      await deleteFile(object.key);
      report.removed.push(object.key);
      report.freedBytes += object.bytes;
    } catch (error) {
      console.error(`[Storage] Could not remove ${object.key}`, error);
    }
  }

  return report;
}

export function describeSweep(report: SweepReport): string {
  if (report.skipped === "not-connected") return "[Storage] Sweep skipped, no bucket connected.";
  if (report.skipped === "no-references") return "[Storage] Sweep skipped, the library read empty.";

  const megabytes = (report.freedBytes / 1024 / 1024).toFixed(1);
  return `[Storage] Swept ${report.removed.length} unreferenced of ${report.scanned} objects (${megabytes} MB), ${report.referenced} in use.`;
}

export function startStorageSweep(): void {
  const run = () => {
    void sweepStorage()
      .then((report) => {
        if (report.skipped === null && report.removed.length === 0) return;
        console.log(describeSweep(report));
      })
      .catch((error: unknown) => {
        console.error("[Storage] Sweep failed", error);
      });
  };

  setTimeout(run, STORAGE_SWEEP.startupDelayMs).unref();
  setInterval(run, STORAGE_SWEEP.intervalMs).unref();
}
