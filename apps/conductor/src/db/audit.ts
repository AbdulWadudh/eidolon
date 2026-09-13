import { count, desc, notInArray, sql } from "drizzle-orm";
import { AUDIT } from "@/config";
import { db } from "@/db";
import { adminAudit } from "@/db/tables";

export interface AuditEntry {
  id: string;
  actorId: string | null;
  actorEmail: string | null;
  method: string;
  path: string;
  status: number;
  detail: string | null;
  createdAt: number;
}

export interface AuditWrite {
  actorId: string | null;
  actorEmail: string | null;
  method: string;
  path: string;
  status: number;
  detail?: string | null;
}

const NEWEST_FIRST = [desc(adminAudit.createdAt), desc(sql`rowid`)] as const;

export function recordAudit(entry: AuditWrite): AuditEntry {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const detail = entry.detail ? entry.detail.slice(0, AUDIT.maxDetailChars) : null;

  db.insert(adminAudit)
    .values({ id, ...entry, detail, createdAt })
    .run();

  pruneAudit();
  return { id, ...entry, detail, createdAt };
}

export function pruneAudit(): number {
  const keep = db
    .select({ id: adminAudit.id })
    .from(adminAudit)
    .orderBy(...NEWEST_FIRST)
    .limit(AUDIT.retain);

  return db
    .delete(adminAudit)
    .where(notInArray(adminAudit.id, keep))
    .returning({
      id: adminAudit.id,
    })
    .all().length;
}

export function countAudit(): number {
  return db.select({ total: count() }).from(adminAudit).get()?.total ?? 0;
}

export function listAudit(limit: number, offset = 0): AuditEntry[] {
  return db
    .select({
      id: adminAudit.id,
      actorId: adminAudit.actorId,
      actorEmail: adminAudit.actorEmail,
      method: adminAudit.method,
      path: adminAudit.path,
      status: adminAudit.status,
      detail: adminAudit.detail,
      createdAt: adminAudit.createdAt,
    })
    .from(adminAudit)
    .orderBy(...NEWEST_FIRST)
    .limit(limit)
    .offset(offset)
    .all();
}

export function clearAudit(): number {
  return db.delete(adminAudit).returning({ id: adminAudit.id }).all().length;
}
