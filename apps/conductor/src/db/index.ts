import { Database } from "bun:sqlite";
import { DEFAULT_PRONOUNS, isPronounKey } from "@eidolon/config";
import { SQLITE_DB_PATH } from "@eidolon/config/server";
import { capitalize } from "es-toolkit";
import { AFFINITY, CHAT_TURN } from "@/config";
import { rebuildChronicles } from "@/db/migrations";
import { applySchema } from "@/db/schema";
import { affinityTier, startingTier } from "@/services/affinity-ladder";

console.log(`[Database] SQLite: ${SQLITE_DB_PATH}`);

export const db = new Database(SQLITE_DB_PATH, { create: true });

db.exec("PRAGMA journal_mode = WAL;");
db.exec("PRAGMA foreign_keys = ON;");

rebuildChronicles(db);

applySchema(db);

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

export function characterDefaults(characterId: string): StoredMind {
  const row = db
    .query(
      "SELECT default_affinity, default_mood, affinity_score, affinity_tier, current_mood FROM characters WHERE id = ?",
    )
    .get(characterId) as {
    default_affinity?: number | null;
    default_mood?: string | null;
    affinity_score?: number;
    affinity_tier?: string;
    current_mood?: string;
  } | null;

  const score = Number.isFinite(row?.default_affinity)
    ? Number(row?.default_affinity)
    : AFFINITY.start;

  return {
    score,
    tier: affinityTier(score),
    mood: row?.default_mood ?? AFFINITY.defaultMood,
  };
}

export function setCharacterDefaults(characterId: string, score: number, mood?: string): void {
  db.query(
    "UPDATE characters SET default_affinity = ?2, default_mood = COALESCE(?3, default_mood) WHERE id = ?1",
  ).run(characterId, score, mood ?? null);
}

export function getCharacterMind(characterId: string, userId: string | null): StoredMind {
  if (!userId) return characterDefaults(characterId);

  const row = db
    .query<
      { affinity_score: number; affinity_tier: string; current_mood: string },
      [string, string]
    >(
      "SELECT affinity_score, affinity_tier, current_mood FROM character_state WHERE character_id = ?1 AND user_id = ?2",
    )
    .get(characterId, userId);

  if (!row) return characterDefaults(characterId);

  return {
    score: Number.isFinite(row.affinity_score) ? Number(row.affinity_score) : AFFINITY.start,
    tier: row.affinity_tier || startingTier(),
    mood: row.current_mood || AFFINITY.defaultMood,
  };
}

export function isAffinityLocked(characterId: string, userId: string): boolean {
  const row = db
    .query<{ affinity_locked: number | null }, [string, string]>(
      "SELECT affinity_locked FROM character_state WHERE character_id = ?1 AND user_id = ?2",
    )
    .get(characterId, userId);
  return row?.affinity_locked === 1;
}

export function setAffinityLock(characterId: string, userId: string, locked: boolean): void {
  ensureCharacter(characterId, userId);
  const mind = getCharacterMind(characterId, userId);
  saveCharacterMind(characterId, userId, mind);
  db.query(
    "UPDATE character_state SET affinity_locked = ?3 WHERE character_id = ?1 AND user_id = ?2",
  ).run(characterId, userId, locked ? 1 : 0);
}

export function saveCharacterMind(characterId: string, userId: string, mind: StoredMind): void {
  db.query(
    `INSERT INTO character_state
       (character_id, user_id, affinity_score, affinity_tier, current_mood, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(character_id, user_id) DO UPDATE SET
       affinity_score = ?3,
       affinity_tier = ?4,
       current_mood = ?5,
       updated_at = ?6`,
  ).run(characterId, userId, mind.score, mind.tier, mind.mood, Date.now());
}

export interface StoredCharacter {
  name: string;
  personality: string;
  systemPrompt: string;
  scenario: string;
  rules: string;
  exampleDialogue: string;
  pronouns: string;
  mood: string;
  tier: string;
}

export function getCharacterCard(characterId: string, userId: string | null): StoredCharacter {
  const mind = getCharacterMind(characterId, userId);
  const row = db
    .query(
      `SELECT name, personality, system_prompt, scenario, rules, example_dialogue,
              pronouns, current_mood, affinity_tier
       FROM characters WHERE id = ?`,
    )
    .get(characterId) as {
    name?: string;
    personality?: string;
    system_prompt?: string;
    scenario?: string;
    rules?: string;
    example_dialogue?: string;
    pronouns?: string;
    current_mood?: string;
    affinity_tier?: string;
  } | null;

  return {
    name: row?.name?.trim() || capitalize(characterId),
    personality: row?.personality ?? "",
    systemPrompt: row?.system_prompt ?? "",
    scenario: row?.scenario ?? "",
    rules: row?.rules ?? "",
    exampleDialogue: row?.example_dialogue ?? "",
    pronouns: isPronounKey(row?.pronouns) ? row.pronouns.trim().toLowerCase() : DEFAULT_PRONOUNS,
    mood: mind.mood,
    tier: mind.tier,
  };
}

export function ensureCharacter(characterId: string, ownerId: string | null): void {
  db.query(
    "INSERT INTO characters (id, name, created_at, owner_id) VALUES (?1, ?2, ?3, ?4) ON CONFLICT(id) DO NOTHING",
  ).run(characterId, capitalize(characterId), Date.now(), ownerId);
}

export function appendMessage(
  characterId: string,
  role: "user" | "assistant",
  content: string,
  userId: string,
): string {
  ensureCharacter(characterId, userId);
  const id = crypto.randomUUID();
  db.query(
    "INSERT INTO messages (id, character_id, role, content, created_at, user_id) VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
  ).run(id, characterId, role, content, Date.now(), userId);
  return id;
}

export function deleteMessage(messageId: string, userId: string): boolean {
  const result = db
    .query("DELETE FROM messages WHERE id = ?1 AND user_id = ?2")
    .run(messageId, userId);
  return result.changes > 0;
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
  userId: string,
  limit: number = CHAT_TURN.historyTurns,
): { role: string; content: string; imageCaption: string | null }[] {
  const rows = db
    .query(
      "SELECT role, content, image_caption FROM messages WHERE character_id = ?1 AND user_id = ?2 ORDER BY created_at DESC, rowid DESC LIMIT ?3",
    )
    .all(characterId, userId, limit) as {
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

export function getTranscript(characterId: string, userId: string, limit: number): StoredMessage[] {
  const rows = db
    .query(
      "SELECT id, role, content, audio_url, audio_duration, image_url, created_at FROM messages WHERE character_id = ?1 AND user_id = ?2 ORDER BY created_at DESC, rowid DESC LIMIT ?3",
    )
    .all(characterId, userId, limit) as {
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

export function countMessages(characterId: string, userId: string): number {
  const row = db
    .query<{ total: number }, [string, string]>(
      "SELECT COUNT(*) as total FROM messages WHERE character_id = ?1 AND user_id = ?2",
    )
    .get(characterId, userId);
  return row?.total ?? 0;
}

export function countAllMessages(characterId: string): number {
  const row = db
    .query<{ total: number }, [string]>(
      "SELECT COUNT(*) as total FROM messages WHERE character_id = ?",
    )
    .get(characterId);
  return row?.total ?? 0;
}

export function forgetCharacter(characterId: string, userId: string): void {
  db.query("DELETE FROM messages WHERE character_id = ?1 AND user_id = ?2").run(
    characterId,
    userId,
  );
  db.query("DELETE FROM chronicles WHERE character_id = ?1 AND user_id = ?2").run(
    characterId,
    userId,
  );
  db.query("DELETE FROM character_state WHERE character_id = ?1 AND user_id = ?2").run(
    characterId,
    userId,
  );
}

export function updateMessageContent(messageId: string, content: string, userId: string): boolean {
  const result = db
    .query("UPDATE messages SET content = ?2 WHERE id = ?1 AND user_id = ?3")
    .run(messageId, content, userId);
  return result.changes > 0;
}

export interface LastExchange {
  assistantId: string;
  assistantText: string;
  userText: string;
}

export function lastExchange(characterId: string, userId: string): LastExchange | null {
  const rows = db
    .query<{ id: string; role: string; content: string }, [string, string]>(
      "SELECT id, role, content FROM messages WHERE character_id = ?1 AND user_id = ?2 ORDER BY created_at DESC, rowid DESC LIMIT 10",
    )
    .all(characterId, userId);

  const assistantAt = rows.findIndex((row) => row.role === "assistant");
  if (assistantAt === -1) return null;

  const user = rows.slice(assistantAt + 1).find((row) => row.role === "user");
  if (!user) return null;

  return {
    assistantId: rows[assistantAt]?.id ?? "",
    assistantText: rows[assistantAt]?.content ?? "",
    userText: user.content,
  };
}

export function getMessage(messageId: string): { characterId: string; content: string } | null {
  const row = db
    .query<{ character_id: string; content: string }, [string]>(
      "SELECT character_id, content FROM messages WHERE id = ?",
    )
    .get(messageId);
  return row ? { characterId: row.character_id, content: row.content } : null;
}

export function clearMessageAudio(messageId: string): void {
  db.query("UPDATE messages SET audio_url = NULL, audio_duration = NULL WHERE id = ?").run(
    messageId,
  );
}
