import { Database } from "bun:sqlite";
import { AFFINITY, CHAT_TURN } from "@eidolon/config";
import { SQLITE_DB_PATH } from "@eidolon/config/server";
import { capitalize } from "es-toolkit";
import { rebuildChronicles } from "@/db/migrations";
import { applySchema } from "@/db/schema";
import { startingTier } from "@/services/affinity-ladder";

console.log(`[Database] SQLite: ${SQLITE_DB_PATH}`);

export const db = new Database(SQLITE_DB_PATH, { create: true });

// Enable Write-Ahead Logging for high concurrency and performance
db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

rebuildChronicles(db);

applySchema(db);

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

export function getCharacterName(characterId: string): string {
  const row = db.query("SELECT name FROM characters WHERE id = ?").get(characterId) as {
    name?: string;
  } | null;
  const name = row?.name?.trim();
  return name && name.length > 0 ? name : capitalize(characterId);
}

export interface StoredMind {
  score: number;
  tier: string;
  mood: string;
}

export function getCharacterMind(characterId: string): StoredMind {
  const row = db
    .query("SELECT affinity_score, affinity_tier, current_mood FROM characters WHERE id = ?")
    .get(characterId) as {
    affinity_score?: number;
    affinity_tier?: string;
    current_mood?: string;
  } | null;

  return {
    score: Number.isFinite(row?.affinity_score) ? Number(row?.affinity_score) : AFFINITY.start,
    tier: row?.affinity_tier ?? startingTier(),
    mood: row?.current_mood ?? AFFINITY.defaultMood,
  };
}

export function isAffinityLocked(characterId: string): boolean {
  const row = db
    .query<{ affinity_locked: number | null }, [string]>(
      "SELECT affinity_locked FROM characters WHERE id = ?",
    )
    .get(characterId);
  return row?.affinity_locked === 1;
}

export function setAffinityLock(characterId: string, locked: boolean): void {
  ensureCharacter(characterId);
  db.query("UPDATE characters SET affinity_locked = ?2 WHERE id = ?1").run(
    characterId,
    locked ? 1 : 0,
  );
}

export function saveCharacterMind(characterId: string, mind: StoredMind): void {
  db.query(
    `INSERT INTO characters (id, name, affinity_score, affinity_tier, current_mood, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(id) DO UPDATE SET
       affinity_score = ?3,
       affinity_tier = ?4,
       current_mood = ?5`,
  ).run(characterId, capitalize(characterId), mind.score, mind.tier, mind.mood, Date.now());
}

export interface StoredCharacter {
  name: string;
  personality: string;
  systemPrompt: string;
  mood: string;
  tier: string;
}

export function getCharacterCard(characterId: string): StoredCharacter {
  const row = db
    .query(
      "SELECT name, personality, system_prompt, current_mood, affinity_tier FROM characters WHERE id = ?",
    )
    .get(characterId) as {
    name?: string;
    personality?: string;
    system_prompt?: string;
    current_mood?: string;
    affinity_tier?: string;
  } | null;

  return {
    name: row?.name?.trim() || capitalize(characterId),
    personality: row?.personality ?? "",
    systemPrompt: row?.system_prompt ?? "",
    mood: row?.current_mood ?? AFFINITY.defaultMood,
    tier: row?.affinity_tier ?? startingTier(),
  };
}

export function ensureCharacter(characterId: string): void {
  db.query(
    "INSERT INTO characters (id, name, created_at) VALUES (?1, ?2, ?3) ON CONFLICT(id) DO NOTHING",
  ).run(characterId, capitalize(characterId), Date.now());
}

export function appendMessage(
  characterId: string,
  role: "user" | "assistant",
  content: string,
): string {
  ensureCharacter(characterId);
  const id = crypto.randomUUID();
  db.query(
    "INSERT INTO messages (id, character_id, role, content, created_at) VALUES (?1, ?2, ?3, ?4, ?5)",
  ).run(id, characterId, role, content, Date.now());
  return id;
}

export function deleteMessage(messageId: string): void {
  db.query("DELETE FROM messages WHERE id = ?").run(messageId);
}

export function setMessageImage(messageId: string, imageUrl: string, caption: string | null): void {
  db.query("UPDATE messages SET image_url = ?1, image_caption = ?2 WHERE id = ?3").run(
    imageUrl,
    caption,
    messageId,
  );
}

export function setMessageAudio(
  messageId: string,
  audioUrl: string,
  audioDuration: number | null,
): void {
  db.query("UPDATE messages SET audio_url = ?1, audio_duration = ?2 WHERE id = ?3").run(
    audioUrl,
    audioDuration,
    messageId,
  );
}

export function getRecentMessages(
  characterId: string,
  limit: number = CHAT_TURN.historyTurns,
): { role: string; content: string; imageCaption: string | null }[] {
  const rows = db
    .query(
      "SELECT role, content, image_caption FROM messages WHERE character_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
    )
    .all(characterId, limit) as {
    role: string;
    content: string;
    image_caption: string | null;
  }[];
  return rows
    .map((row) => ({
      role: row.role,
      content: row.content,
      imageCaption: row.image_caption,
    }))
    .reverse();
}

export interface StoredMessage {
  id: string;
  role: string;
  content: string;
  audioUrl: string | null;
  audioDuration: number | null;
  imageUrl: string | null;
  createdAt: number;
}

export function getTranscript(characterId: string, limit: number): StoredMessage[] {
  const rows = db
    .query(
      "SELECT id, role, content, audio_url, audio_duration, image_url, created_at FROM messages WHERE character_id = ? ORDER BY created_at DESC, rowid DESC LIMIT ?",
    )
    .all(characterId, limit) as {
    id: string;
    role: string;
    content: string;
    audio_url: string | null;
    audio_duration: number | null;
    image_url: string | null;
    created_at: number;
  }[];

  return rows
    .map((row) => ({
      id: row.id,
      role: row.role,
      content: row.content,
      audioUrl: row.audio_url,
      audioDuration: row.audio_duration,
      imageUrl: row.image_url,
      createdAt: row.created_at,
    }))
    .reverse();
}

export function countMessages(characterId: string): number {
  const row = db
    .query<{ total: number }, [string]>(
      "SELECT COUNT(*) as total FROM messages WHERE character_id = ?",
    )
    .get(characterId);
  return row?.total ?? 0;
}

export function forgetCharacter(characterId: string): void {
  db.query("DELETE FROM messages WHERE character_id = ?").run(characterId);
  db.query("DELETE FROM chronicles WHERE character_id = ?").run(characterId);
  db.query(
    "UPDATE characters SET affinity_score = ?2, affinity_tier = ?3, current_mood = ?4 WHERE id = ?1",
  ).run(characterId, AFFINITY.start, startingTier(), AFFINITY.defaultMood);
}
