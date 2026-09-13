import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import { getStorageConfig, isStorageConnected } from "@/services/storage";
import { describeSweep, type SweepReport, sweepStorage } from "@/services/storage-sweep";

export const adminStorage = new Hono<OwnerEnv>();

function view(report: SweepReport) {
  const storage = getStorageConfig();

  return {
    connected: isStorageConnected(),
    endpoint: storage.endpoint,
    bucket: storage.bucket,
    publicUrl: storage.publicUrl,
    scanned: report.scanned,
    referenced: report.referenced,
    skipped: report.skipped,
    freedBytes: report.freedBytes,
    removed: report.removed,
    orphans: report.orphans,
    orphanBytes: report.orphans.reduce((total, object) => total + object.bytes, 0),
  };
}

adminStorage.get("/", async (c) => c.json(view(await sweepStorage({ dryRun: true }))));

adminStorage.post("/sweep", async (c) => {
  const report = await sweepStorage();
  c.set("auditDetail", describeSweep(report));
  return c.json(view(report));
});
