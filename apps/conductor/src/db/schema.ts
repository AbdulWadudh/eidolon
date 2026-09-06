import type { Database } from "bun:sqlite";

function addColumnIfMissing(db: Database, table: string, column: string, definition: string): void {
  const columns = db.query<{ name: string }, []>(`PRAGMA table_info(${table})`).all();
  if (columns.some((entry) => entry.name === column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
}

export function applySchema(db: Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS characters (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      tagline TEXT,
      personality TEXT,
      system_prompt TEXT,
      avatar_url TEXT,
      affinity_tier TEXT DEFAULT 'Neutral',
      affinity_score INTEGER DEFAULT 0,
      current_mood TEXT DEFAULT 'Neutral',
      created_at INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      is_narration INTEGER DEFAULT 0,
      audio_url TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS stages (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      name TEXT NOT NULL,
      backdrop_url TEXT,
      lighting_tint TEXT,
      soundscape_stems TEXT,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS chronicles (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      chapter_index INTEGER NOT NULL,
      summary_text TEXT NOT NULL,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_chronicles_character
      ON chronicles(character_id, chapter_index DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_chronicles_chapter
      ON chronicles(character_id, chapter_index);

    CREATE TABLE IF NOT EXISTS lorebook_entries (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      keys TEXT NOT NULL,
      content TEXT NOT NULL,
      required_affinity INTEGER DEFAULT 0,
      is_active INTEGER DEFAULT 1,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_lorebook_character
      ON lorebook_entries(character_id, is_active);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_stages_character_name
      ON stages(character_id, name);
  `);

  addColumnIfMissing(db, "stages", "updated_at", "INTEGER");
  addColumnIfMissing(db, "characters", "affinity_locked", "INTEGER DEFAULT 0");
  addColumnIfMissing(db, "messages", "audio_duration", "REAL");
  addColumnIfMissing(db, "messages", "image_url", "TEXT");
  addColumnIfMissing(db, "messages", "image_caption", "TEXT");
  addColumnIfMissing(db, "characters", "appearance", "TEXT");
  addColumnIfMissing(db, "characters", "background_url", "TEXT");
  addColumnIfMissing(db, "characters", "avatar_crop", "TEXT");
  addColumnIfMissing(db, "characters", "face_url", "TEXT");
}
