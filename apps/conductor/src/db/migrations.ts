import type { Database } from "bun:sqlite";

interface ColumnRow {
  name: string;
}

function columnNames(db: Database, table: string): string[] {
  return db
    .query<ColumnRow, []>(`PRAGMA table_info(${table})`)
    .all()
    .map((row) => row.name);
}

export function hasTable(db: Database, table: string): boolean {
  const row = db
    .query<{ name: string }, [string]>(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(table);
  return row !== null;
}

export function needsChronicleRebuild(db: Database): boolean {
  if (!hasTable(db, "chronicles")) return false;
  const columns = columnNames(db, "chronicles");
  return !columns.includes("summary_text") || !columns.includes("chapter_index");
}

export function rebuildChronicles(db: Database): void {
  if (!needsChronicleRebuild(db)) return;

  const columns = columnNames(db, "chronicles");
  const summarySource = columns.includes("summary_text") ? "summary_text" : "summary";

  db.exec("DROP INDEX IF EXISTS idx_chronicles_character");
  db.exec("DROP INDEX IF EXISTS idx_chronicles_chapter");
  db.exec("ALTER TABLE chronicles RENAME TO chronicles_legacy");
  db.exec(`
    CREATE TABLE chronicles (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      chapter_index INTEGER NOT NULL,
      summary_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    )
  `);
  db.exec(`
    INSERT INTO chronicles (id, character_id, chapter_index, summary_text, created_at)
    SELECT
      id,
      character_id,
      ROW_NUMBER() OVER (PARTITION BY character_id ORDER BY created_at, rowid),
      ${summarySource},
      created_at
    FROM chronicles_legacy
  `);
  db.exec("DROP TABLE chronicles_legacy");
  db.exec(
    "CREATE INDEX IF NOT EXISTS idx_chronicles_character ON chronicles(character_id, chapter_index DESC)",
  );
  db.exec(
    "CREATE UNIQUE INDEX IF NOT EXISTS idx_chronicles_chapter ON chronicles(character_id, chapter_index)",
  );
}
