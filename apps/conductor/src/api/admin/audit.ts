import { Hono } from "hono";
import type { OwnerEnv } from "@/auth/guard";
import { AUDIT } from "@/config";
import { clearAudit, countAudit, listAudit } from "@/db/audit";

export const adminAudit = new Hono<OwnerEnv>();

function counted(raw: string | undefined, fallback: number, least: number): number {
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed >= least ? Math.floor(parsed) : fallback;
}

adminAudit.get("/", (c) => {
  const limit = Math.min(counted(c.req.query("limit"), AUDIT.pageSize, 1), AUDIT.pageSize);
  const offset = counted(c.req.query("offset"), 0, 0);

  return c.json({
    total: countAudit(),
    retain: AUDIT.retain,
    limit,
    offset,
    entries: listAudit(limit, offset),
  });
});

adminAudit.delete("/", (c) => {
  const removed = clearAudit();
  c.set("auditDetail", `cleared ${removed} entries`);
  return c.json({ ok: true, removed });
});
