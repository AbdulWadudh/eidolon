import { Database } from "bun:sqlite";
import { DEFAULT_PRONOUNS, isPronounKey } from "@eidolon/config";
import { SQLITE_DB_PATH } from "@eidolon/config/server";
import { and, count, desc, eq, sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/bun-sqlite";
import { capitalize } from "es-toolkit";
import { AFFINITY, CHAT_TURN } from "@/config";
import * as authTables from "@/db/auth-tables";
import { runMigrations } from "@/db/migrate";
import * as tables from "@/db/tables";
import { characterState, characters, messages } from "@/db/tables";
import { affinityTier, startingTier } from "@/services/affinity-ladder";

console.log(`[Database] SQLite: ${SQLITE_DB_PATH}`);

export const sqlite = new Database(SQLITE_DB_PATH, { create: true });

sqlite.exec("PRAGMA journal_mode = WAL;");
sqlite.exec("PRAGMA foreign_keys = ON;");

export const schema = { ...tables, ...authTables };

export const db = drizzle(sqlite, { schema });

runMigrations(sqlite, db);

export function checkDatabaseHealth(): boolean {
  try {
    return sqlite.query<{ result: number }, []>("SELECT 1 as result").get()?.result === 1;
  } catch (error) {
    console.error("[Database] Health check failed:", error);
    return false;
  }
}

export interface StoredMind {
  score: number;
  tier: string;
  mood: string;
}

export function characterDefaults(characterId: string): StoredMind {
  const row = db
    .select({
      defaultAffinity: characters.defaultAffinity,
      defaultMood: characters.defaultMood,
    })
    .from(characters)
    .where(eq(characters.id, characterId))
    .get();

  const score = Number.isFinite(row?.defaultAffinity)
    ? Number(row?.defaultAffinity)
    : AFFINITY.start;

  return {
    score,
    tier: affinityTier(score),
    mood: row?.defaultMood ?? AFFINITY.defaultMood,
  };
}

export function setCharacterDefaults(characterId: string, score: number, mood?: string): void {
  db.update(characters)
    .set({
      defaultAffinity: score,
      defaultMood: sql`COALESCE(${mood ?? null}, ${characters.defaultMood})`,
    })
    .where(eq(characters.id, characterId))
    .run();
}

export function getCharacterMind(characterId: string, userId: string | null): StoredMind {
  if (!userId) return characterDefaults(characterId);

  const row = db
    .select({
      score: characterState.affinityScore,
      tier: characterState.affinityTier,
      mood: characterState.currentMood,
    })
    .from(characterState)
    .where(and(eq(characterState.characterId, characterId), eq(characterState.userId, userId)))
    .get();

  if (!row) return characterDefaults(characterId);

  return {
    score: Number.isFinite(row.score) ? Number(row.score) : AFFINITY.start,
    tier: row.tier || startingTier(),
    mood: row.mood || AFFINITY.defaultMood,
  };
}

export function isAffinityLocked(characterId: string, userId: string): boolean {
  const row = db
    .select({ locked: characterState.affinityLocked })
    .from(characterState)
    .where(and(eq(characterState.characterId, characterId), eq(characterState.userId, userId)))
    .get();
  return row?.locked === 1;
}

export function setAffinityLock(characterId: string, userId: string, locked: boolean): void {
  ensureCharacter(characterId, userId);
  saveCharacterMind(characterId, userId, getCharacterMind(characterId, userId));

  db.update(characterState)
    .set({ affinityLocked: locked ? 1 : 0 })
    .where(and(eq(characterState.characterId, characterId), eq(characterState.userId, userId)))
    .run();
}

export function saveCharacterMind(characterId: string, userId: string, mind: StoredMind): void {
  const updatedAt = Date.now();

  db.insert(characterState)
    .values({
      characterId,
      userId,
      affinityScore: mind.score,
      affinityTier: mind.tier,
      currentMood: mind.mood,
      updatedAt,
    })
    .onConflictDoUpdate({
      target: [characterState.characterId, characterState.userId],
      set: {
        affinityScore: mind.score,
        affinityTier: mind.tier,
        currentMood: mind.mood,
        updatedAt,
      },
    })
    .run();
}

export interface StoredCharacter {
  name: string;
  personality: string;
  systemPrompt: string;
  scenario: string;
  rules: string;
  exampleDialogue: string;
  pronouns: string;
  likes: string;
  dislikes: string;
  mood: string;
  tier: string;
}

export function getCharacterCard(characterId: string, userId: string | null): StoredCharacter {
  const mind = getCharacterMind(characterId, userId);
  const row = db
    .select({
      name: characters.name,
      personality: characters.personality,
      systemPrompt: characters.systemPrompt,
      scenario: characters.scenario,
      rules: characters.rules,
      exampleDialogue: characters.exampleDialogue,
      pronouns: characters.pronouns,
      likes: characters.likes,
      dislikes: characters.dislikes,
    })
    .from(characters)
    .where(eq(characters.id, characterId))
    .get();

  return {
    name: row?.name?.trim() || capitalize(characterId),
    personality: row?.personality ?? "",
    systemPrompt: row?.systemPrompt ?? "",
    scenario: row?.scenario ?? "",
    rules: row?.rules ?? "",
    exampleDialogue: row?.exampleDialogue ?? "",
    likes: row?.likes ?? "",
    dislikes: row?.dislikes ?? "",
    pronouns: isPronounKey(row?.pronouns) ? row.pronouns.trim().toLowerCase() : DEFAULT_PRONOUNS,
    mood: mind.mood,
    tier: mind.tier,
  };
}

export function ensureCharacter(characterId: string, ownerId: string | null): void {
  db.insert(characters)
    .values({
      id: characterId,
      name: capitalize(characterId),
      createdAt: Date.now(),
      ownerId,
    })
    .onConflictDoNothing({ target: characters.id })
    .run();
}

export function appendMessage(
  characterId: string,
  role: "user" | "assistant",
  content: string,
  userId: string,
): string {
  ensureCharacter(characterId, userId);

  return db
    .insert(messages)
    .values({ characterId, role, content, createdAt: Date.now(), userId })
    .returning({ id: messages.id })
    .get().id;
}

// Media made in a conversation belongs to whoever was in it, and the message already knows.
export function messageOwner(messageId: string): string | null {
  return (
    db.select({ userId: messages.userId }).from(messages).where(eq(messages.id, messageId)).get()
      ?.userId ?? null
  );
}

export function deleteMessage(messageId: string, userId: string): boolean {
  return (
    db
      .delete(messages)
      .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
      .returning({ id: messages.id })
      .all().length > 0
  );
}

export function setMessageImage(messageId: string, imageUrl: string, caption: string | null): void {
  db.update(messages)
    .set({ imageUrl, imageCaption: caption })
    .where(eq(messages.id, messageId))
    .run();
}

export function setMessageAudio(
  messageId: string,
  audioUrl: string,
  audioDuration: number | null,
): void {
  db.update(messages).set({ audioUrl, audioDuration }).where(eq(messages.id, messageId)).run();
}

export function getRecentMessages(
  characterId: string,
  userId: string,
  limit: number = CHAT_TURN.historyTurns,
): { role: string; content: string; imageCaption: string | null }[] {
  return db
    .select({
      role: messages.role,
      content: messages.content,
      imageCaption: messages.imageCaption,
    })
    .from(messages)
    .where(and(eq(messages.characterId, characterId), eq(messages.userId, userId)))
    .orderBy(desc(messages.createdAt), desc(sql`rowid`))
    .limit(limit)
    .all()
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
  return db
    .select({
      id: messages.id,
      role: messages.role,
      content: messages.content,
      audioUrl: messages.audioUrl,
      audioDuration: messages.audioDuration,
      imageUrl: messages.imageUrl,
      createdAt: messages.createdAt,
    })
    .from(messages)
    .where(and(eq(messages.characterId, characterId), eq(messages.userId, userId)))
    .orderBy(desc(messages.createdAt), desc(sql`rowid`))
    .limit(limit)
    .all()
    .reverse();
}

export function countMessages(characterId: string, userId: string): number {
  const row = db
    .select({ total: count() })
    .from(messages)
    .where(and(eq(messages.characterId, characterId), eq(messages.userId, userId)))
    .get();
  return row?.total ?? 0;
}

export function forgetCharacter(characterId: string, userId: string): void {
  db.delete(messages)
    .where(and(eq(messages.characterId, characterId), eq(messages.userId, userId)))
    .run();
  db.delete(tables.chronicles)
    .where(
      and(eq(tables.chronicles.characterId, characterId), eq(tables.chronicles.userId, userId)),
    )
    .run();
  db.delete(characterState)
    .where(and(eq(characterState.characterId, characterId), eq(characterState.userId, userId)))
    .run();
}

export function updateMessageContent(messageId: string, content: string, userId: string): boolean {
  return (
    db
      .update(messages)
      .set({ content })
      .where(and(eq(messages.id, messageId), eq(messages.userId, userId)))
      .returning({ id: messages.id })
      .all().length > 0
  );
}

export interface LastExchange {
  assistantId: string;
  assistantText: string;
  userText: string;
}

export function lastExchange(characterId: string, userId: string): LastExchange | null {
  const rows = db
    .select({ id: messages.id, role: messages.role, content: messages.content })
    .from(messages)
    .where(and(eq(messages.characterId, characterId), eq(messages.userId, userId)))
    .orderBy(desc(messages.createdAt), desc(sql`rowid`))
    .limit(10)
    .all();

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
    .select({ characterId: messages.characterId, content: messages.content })
    .from(messages)
    .where(eq(messages.id, messageId))
    .get();
  return row ?? null;
}

export function clearMessageAudio(messageId: string): void {
  db.update(messages)
    .set({ audioUrl: null, audioDuration: null })
    .where(eq(messages.id, messageId))
    .run();
}
