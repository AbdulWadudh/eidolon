import { Database } from "bun:sqlite";
import { SQLITE_DB_PATH } from "@eidolon/config/server";

console.log(`[Database] SQLite: ${SQLITE_DB_PATH}`);

export const db = new Database(SQLITE_DB_PATH, { create: true });

// Enable Write-Ahead Logging for high concurrency and performance
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

// Initialize relational schema
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
`);

/**
 * Health check helper for the SQLite database.
 */
export function checkDatabaseHealth(): boolean {
  try {
    const result = db.query<{ result: number }, []>("SELECT 1 as result").get();
    return result?.result === 1;
  } catch (error) {
    console.error("[Database] Health check failed:", error);
    return false;
  }
}
