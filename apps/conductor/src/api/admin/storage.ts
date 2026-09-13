import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import { deleteFile, getStorageConfig, isStorageConnected } from "@/services/storage";
import { browseStorage } from "@/services/storage-browse";
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

function flag(raw: string | undefined): boolean {
  return raw === "true" || raw === "1";
}

function numeric(raw: string | undefined): number | undefined {
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

adminStorage.get("/objects", async (c) =>
  c.json(
    await browseStorage({
      search: c.req.query("search"),
      onlyOrphans: flag(c.req.query("orphans")),
      limit: numeric(c.req.query("limit")),
      offset: numeric(c.req.query("offset")),
    }),
  ),
);

adminStorage.delete("/objects/:key", async (c) => {
  const key = c.req.param("key");
  if (!isStorageConnected()) return c.json({ error: "No bucket is connected." }, 409);

  try {
    await deleteFile(key);
  } catch (error) {
    return c.json({ error: error instanceof Error ? error.message : "Could not remove it." }, 502);
  }

  c.set("auditDetail", `deleted ${key}`);
  return c.json({ ok: true });
});
