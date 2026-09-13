import { db } from "@/db";

export interface StoredOverride {
  path: string;
  value: unknown;
  updatedAt: number;
}

interface OverrideRow {
  path: string;
  value: string;
  updated_at: number;
}

function decode(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function toStored(row: OverrideRow): StoredOverride {
  return { path: row.path, value: decode(row.value), updatedAt: row.updated_at };
}

export function listOverrides(): StoredOverride[] {
  return db
    .query<OverrideRow, []>("SELECT path, value, updated_at FROM config_overrides ORDER BY path")
    .all()
    .map(toStored);
}

export function overridesUnder(prefix: string): StoredOverride[] {
  return db
    .query<OverrideRow, [string]>(
      "SELECT path, value, updated_at FROM config_overrides WHERE path LIKE ?1 ORDER BY path",
    )
    .all(`${prefix}%`)
    .map(toStored);
}

export function readOverride(path: string): StoredOverride | null {
  const row = db
    .query<OverrideRow, [string]>(
      "SELECT path, value, updated_at FROM config_overrides WHERE path = ? LIMIT 1",
    )
    .get(path);
  return row ? toStored(row) : null;
}

export function writeOverride(path: string, value: unknown): StoredOverride {
  const encoded = JSON.stringify(value ?? null);
  const updatedAt = Date.now();

  db.query(
    `INSERT INTO config_overrides (path, value, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(path) DO UPDATE SET value = ?2, updated_at = ?3`,
  ).run(path, encoded, updatedAt);

  return { path, value, updatedAt };
}

export function removeOverride(path: string): boolean {
  return db.query("DELETE FROM config_overrides WHERE path = ?").run(path).changes > 0;
}

export function removeOverridesUnder(prefix: string): number {
  return db.query("DELETE FROM config_overrides WHERE path LIKE ?").run(`${prefix}%`).changes;
}
