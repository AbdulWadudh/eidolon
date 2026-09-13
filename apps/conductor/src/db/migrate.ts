import type { Database } from "bun:sqlite";
import { createHash } from "node:crypto";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { BunSQLiteDatabase } from "drizzle-orm/bun-sqlite";
import { migrate } from "drizzle-orm/bun-sqlite/migrator";

export const MIGRATIONS_FOLDER = join(import.meta.dir, "../../drizzle");

interface JournalEntry {
  tag: string;
  when: number;
}

function tableExists(sqlite: Database, name: string): boolean {
  return (
    sqlite
      .query<{ name: string }, [string]>(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get(name) !== null
  );
}

function baselineEntry(): JournalEntry | null {
  const journal = JSON.parse(
    readFileSync(join(MIGRATIONS_FOLDER, "meta/_journal.json"), "utf8"),
  ) as { entries: JournalEntry[] };
  return journal.entries[0] ?? null;
}

function adoptPreDrizzleDatabase(sqlite: Database): void {
  if (tableExists(sqlite, "__drizzle_migrations")) return;
  if (!tableExists(sqlite, "characters")) return;

  const baseline = baselineEntry();
  if (!baseline) return;

  const sql = readFileSync(join(MIGRATIONS_FOLDER, `${baseline.tag}.sql`), "utf8");
  const hash = createHash("sha256").update(sql).digest("hex");

  sqlite.exec(
    "CREATE TABLE IF NOT EXISTS __drizzle_migrations (id SERIAL PRIMARY KEY, hash text NOT NULL, created_at numeric)",
  );
  sqlite
    .query("INSERT INTO __drizzle_migrations (hash, created_at) VALUES (?1, ?2)")
    .run(hash, baseline.when);

  console.log(`[Database] Adopted the existing schema as ${baseline.tag}.`);
}

export function runMigrations<TSchema extends Record<string, unknown>>(
  sqlite: Database,
  db: BunSQLiteDatabase<TSchema>,
): void {
  adoptPreDrizzleDatabase(sqlite);
  migrate(db, { migrationsFolder: MIGRATIONS_FOLDER });
}
