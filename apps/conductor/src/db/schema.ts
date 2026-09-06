import type { Database } from "bun:sqlite";

/**
 * A portrait used to live in `characters.avatar_url` alone, so generating a new
 * one destroyed the old. Every render is a row now, and the column just points
 * at whichever is currently in use. The ones already on disk are adopted here so
 * a reader does not lose the face they have been talking to.
 */
function adoptExistingPortraits(db: Database): void {
  db.exec(`
    INSERT OR IGNORE INTO character_portraits (id, character_id, url, prompt, created_at)
    SELECT 'adopted-avatar:' || id, id, avatar_url, NULL, created_at
      FROM characters
     WHERE avatar_url IS NOT NULL AND avatar_url != '';
  `);

  db.exec(`
    INSERT OR IGNORE INTO character_portraits (id, character_id, url, prompt, created_at)
    SELECT 'adopted-face:' || id, id, face_url, NULL, created_at
      FROM characters
     WHERE face_url IS NOT NULL AND face_url != '';
  `);
}

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

    CREATE TABLE IF NOT EXISTS character_portraits (
      id TEXT PRIMARY KEY,
      character_id TEXT NOT NULL,
      url TEXT NOT NULL,
      prompt TEXT,
      created_at INTEGER NOT NULL,
      FOREIGN KEY(character_id) REFERENCES characters(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_portraits_character
      ON character_portraits(character_id, created_at DESC);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_portraits_url
      ON character_portraits(character_id, url);
  `);

  adoptExistingPortraits(db);

  addColumnIfMissing(db, "stages", "updated_at", "INTEGER");
  addColumnIfMissing(db, "characters", "affinity_locked", "INTEGER DEFAULT 0");
  addColumnIfMissing(db, "characters", "greeting", "TEXT");
  addColumnIfMissing(db, "characters", "scenario", "TEXT");
  addColumnIfMissing(db, "characters", "example_dialogue", "TEXT");
  addColumnIfMissing(db, "characters", "rules", "TEXT");
  addColumnIfMissing(db, "characters", "voice", "TEXT");
  addColumnIfMissing(db, "characters", "owner_id", "TEXT");
  addColumnIfMissing(db, "characters", "is_public", "INTEGER DEFAULT 0");
  addColumnIfMissing(db, "characters", "forked_from", "TEXT");
  addColumnIfMissing(db, "messages", "audio_duration", "REAL");
  addColumnIfMissing(db, "messages", "image_url", "TEXT");
  addColumnIfMissing(db, "messages", "image_caption", "TEXT");
  addColumnIfMissing(db, "characters", "appearance", "TEXT");
  addColumnIfMissing(db, "characters", "background_url", "TEXT");
  addColumnIfMissing(db, "characters", "avatar_crop", "TEXT");
  addColumnIfMissing(db, "characters", "face_url", "TEXT");
}
