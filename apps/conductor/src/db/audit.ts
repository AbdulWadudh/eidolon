import { AUDIT } from "@/config";
import { db } from "@/db";

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

interface AuditRow {
  id: string;
  actor_id: string | null;
  actor_email: string | null;
  method: string;
  path: string;
  status: number;
  detail: string | null;
  created_at: number;
}

function toEntry(row: AuditRow): AuditEntry {
  return {
    id: row.id,
    actorId: row.actor_id,
    actorEmail: row.actor_email,
    method: row.method,
    path: row.path,
    status: row.status,
    detail: row.detail,
    createdAt: row.created_at,
  };
}

export interface AuditWrite {
  actorId: string | null;
  actorEmail: string | null;
  method: string;
  path: string;
  status: number;
  detail?: string | null;
}

export function recordAudit(entry: AuditWrite): AuditEntry {
  const id = crypto.randomUUID();
  const createdAt = Date.now();
  const detail = entry.detail ? entry.detail.slice(0, AUDIT.maxDetailChars) : null;

  db.query(
    `INSERT INTO admin_audit
       (id, actor_id, actor_email, method, path, status, detail, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`,
  ).run(
    id,
    entry.actorId,
    entry.actorEmail,
    entry.method,
    entry.path,
    entry.status,
    detail,
    createdAt,
  );

  pruneAudit();
  return { id, ...entry, detail, createdAt };
}

export function pruneAudit(): number {
  return db
    .query(
      `DELETE FROM admin_audit WHERE id NOT IN (
         SELECT id FROM admin_audit ORDER BY created_at DESC, rowid DESC LIMIT ?1
       )`,
    )
    .run(AUDIT.retain).changes;
}

export function countAudit(): number {
  return (
    db.query<{ total: number }, []>("SELECT COUNT(*) as total FROM admin_audit").get()?.total ?? 0
  );
}

export function listAudit(limit: number, offset = 0): AuditEntry[] {
  return db
    .query<AuditRow, [number, number]>(
      `SELECT id, actor_id, actor_email, method, path, status, detail, created_at
         FROM admin_audit
        ORDER BY created_at DESC, rowid DESC
        LIMIT ?1 OFFSET ?2`,
    )
    .all(limit, offset)
    .map(toEntry);
}

export function clearAudit(): number {
  return db.query("DELETE FROM admin_audit").run().changes;
}
