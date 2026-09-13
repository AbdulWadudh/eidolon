import { asc, eq, like } from "drizzle-orm";
import { db } from "@/db";
import { configOverrides } from "@/db/tables";

export interface StoredOverride {
  path: string;
  value: unknown;
  updatedAt: number;
}

interface OverrideRow {
  path: string;
  value: string;
  updatedAt: number;
}

function decode(raw: string): unknown {
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    return null;
  }
}

function toStored(row: OverrideRow): StoredOverride {
  return { path: row.path, value: decode(row.value), updatedAt: row.updatedAt };
}

export function listOverrides(): StoredOverride[] {
  return db.select().from(configOverrides).orderBy(asc(configOverrides.path)).all().map(toStored);
}

export function overridesUnder(prefix: string): StoredOverride[] {
  return db
    .select()
    .from(configOverrides)
    .where(like(configOverrides.path, `${prefix}%`))
    .orderBy(asc(configOverrides.path))
    .all()
    .map(toStored);
}

export function readOverride(path: string): StoredOverride | null {
  const row = db.select().from(configOverrides).where(eq(configOverrides.path, path)).get();
  return row ? toStored(row) : null;
}

export function writeOverride(path: string, value: unknown): StoredOverride {
  const encoded = JSON.stringify(value ?? null);
  const updatedAt = Date.now();

  db.insert(configOverrides)
    .values({ path, value: encoded, updatedAt })
    .onConflictDoUpdate({
      target: configOverrides.path,
      set: { value: encoded, updatedAt },
    })
    .run();

  return { path, value, updatedAt };
}

export function removeOverride(path: string): boolean {
  return (
    db
      .delete(configOverrides)
      .where(eq(configOverrides.path, path))
      .returning({
        path: configOverrides.path,
      })
      .all().length > 0
  );
}

export function removeOverridesUnder(prefix: string): number {
  return db
    .delete(configOverrides)
    .where(like(configOverrides.path, `${prefix}%`))
    .returning({
      path: configOverrides.path,
    })
    .all().length;
}
