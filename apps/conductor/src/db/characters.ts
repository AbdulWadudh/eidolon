import { DEFAULT_PRONOUNS, isPronounKey } from "@eidolon/config";
import { and, count, desc, eq, isNull, notExists, or, sql } from "drizzle-orm";
import { alias } from "drizzle-orm/sqlite-core";
import { VOICE } from "@/config";
import { countMessages, db, getCharacterMind } from "@/db";
import { getLoreEntries, upsertLoreEntry } from "@/db/lorebook";
import { forgetOwnerEmail } from "@/db/owner";
import { characterState, characters, chronicles, messages, stages } from "@/db/tables";
import { safeJsonParse } from "@/utils/json";

export interface CharacterCard {
  id: string;
  name: string;
  tagline: string;
  personality: string;
  systemPrompt: string;
  scenario: string;
  rules: string;
  exampleDialogue: string;
  greeting: string;
  voice: string;
  pronouns: string;
  likes: string;
  dislikes: string;
  personaId: string | null;
  ownerId: string | null;
  isPublic: boolean;
  forkedFrom: string | null;
}

export interface CharacterSummary extends CharacterCard {
  avatarUrl: string | null;
  affinity: number;
  tier: string;
  mood: string;
  messageCount: number;
  createdAt: number;
}

type CharacterRow = typeof characters.$inferSelect;

const forks = alias(characters, "forks");

const COLUMNS = {
  id: characters.id,
  name: characters.name,
  tagline: characters.tagline,
  personality: characters.personality,
  systemPrompt: characters.systemPrompt,
  scenario: characters.scenario,
  rules: characters.rules,
  exampleDialogue: characters.exampleDialogue,
  greeting: characters.greeting,
  voice: characters.voice,
  pronouns: characters.pronouns,
  likes: characters.likes,
  dislikes: characters.dislikes,
  personaId: characters.personaId,
  ownerId: characters.ownerId,
  isPublic: characters.isPublic,
  forkedFrom: characters.forkedFrom,
  avatarUrl: characters.avatarUrl,
  avatarCrop: characters.avatarCrop,
  createdAt: characters.createdAt,
};

type CardRow = Pick<
  CharacterRow,
  | "id"
  | "name"
  | "tagline"
  | "personality"
  | "systemPrompt"
  | "scenario"
  | "rules"
  | "exampleDialogue"
  | "greeting"
  | "voice"
  | "pronouns"
  | "likes"
  | "dislikes"
  | "personaId"
  | "ownerId"
  | "isPublic"
  | "forkedFrom"
>;

function toCard(row: CardRow): CharacterCard {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline ?? "",
    personality: row.personality ?? "",
    systemPrompt: row.systemPrompt ?? "",
    scenario: row.scenario ?? "",
    rules: row.rules ?? "",
    exampleDialogue: row.exampleDialogue ?? "",
    greeting: row.greeting ?? "",
    voice: row.voice ?? VOICE.defaultId,
    pronouns: isPronounKey(row.pronouns) ? row.pronouns.trim().toLowerCase() : DEFAULT_PRONOUNS,
    likes: row.likes ?? "",
    dislikes: row.dislikes ?? "",
    personaId: row.personaId,
    ownerId: row.ownerId,
    isPublic: row.isPublic === 1,
    forkedFrom: row.forkedFrom,
  };
}

export function characterExists(id: string): boolean {
  return (
    db.select({ id: characters.id }).from(characters).where(eq(characters.id, id)).get() !==
    undefined
  );
}

export function getCharacter(id: string): CharacterCard | null {
  const row = db.select(COLUMNS).from(characters).where(eq(characters.id, id)).get();
  return row ? toCard(row) : null;
}

function countEveryMessage(characterId: string): number {
  return (
    db.select({ total: count() }).from(messages).where(eq(messages.characterId, characterId)).get()
      ?.total ?? 0
  );
}

export function listCharacters(ownerId?: string): CharacterSummary[] {
  // Someone who has already forked a character should see their own copy and not the
  // original beside it, which would read as the same character listed twice.
  const superseded = ownerId
    ? notExists(
        db
          .select({ one: sql`1` })
          .from(forks)
          .where(and(eq(forks.forkedFrom, characters.id), eq(forks.ownerId, ownerId))),
      )
    : undefined;

  const visible = ownerId
    ? and(or(eq(characters.ownerId, ownerId), eq(characters.isPublic, 1)), superseded)
    : undefined;
  const rows = db
    .select(COLUMNS)
    .from(characters)
    .where(visible)
    .orderBy(desc(characters.createdAt))
    .all();

  return rows.map((row) => {
    const mind = getCharacterMind(row.id, ownerId ?? null);

    return {
      ...toCard(row),
      avatarUrl: row.avatarUrl,
      avatarCrop: row.avatarCrop ? safeJsonParse<unknown>(row.avatarCrop, null) : null,
      affinity: mind.score,
      tier: mind.tier,
      mood: mind.mood,
      messageCount: ownerId ? countMessages(row.id, ownerId) : countEveryMessage(row.id),
      createdAt: row.createdAt,
    };
  });
}

export type CharacterDraft = Partial<Omit<CharacterCard, "id">> & { name: string };

export function createCharacter(draft: CharacterDraft): CharacterCard {
  const row = db
    .insert(characters)
    .values({
      name: draft.name.trim(),
      tagline: draft.tagline ?? "",
      personality: draft.personality ?? "",
      systemPrompt: draft.systemPrompt ?? "",
      scenario: draft.scenario ?? "",
      rules: draft.rules ?? "",
      exampleDialogue: draft.exampleDialogue ?? "",
      greeting: draft.greeting ?? "",
      likes: draft.likes ?? "",
      dislikes: draft.dislikes ?? "",
      voice: draft.voice ?? VOICE.defaultId,
      pronouns: isPronounKey(draft.pronouns)
        ? draft.pronouns.trim().toLowerCase()
        : DEFAULT_PRONOUNS,
      ownerId: draft.ownerId ?? null,
      isPublic: draft.isPublic ? 1 : 0,
      forkedFrom: draft.forkedFrom ?? null,
      createdAt: Date.now(),
    })
    .returning(COLUMNS)
    .get();

  return toCard(row);
}

type EditableField = keyof Omit<CharacterCard, "id" | "ownerId" | "forkedFrom">;

export const EDITABLE: EditableField[] = [
  "name",
  "tagline",
  "personality",
  "systemPrompt",
  "scenario",
  "rules",
  "exampleDialogue",
  "greeting",
  "likes",
  "dislikes",
  "voice",
  "pronouns",
  "isPublic",
];

export function updateCharacter(
  id: string,
  patch: Partial<Omit<CharacterCard, "id">>,
): CharacterCard | null {
  if (!characterExists(id)) return null;

  const written: Partial<typeof characters.$inferInsert> = {};

  for (const field of EDITABLE) {
    const value = patch[field];
    if (value === undefined) continue;
    if (field === "pronouns" && !isPronounKey(value as string)) continue;
    Object.assign(written, { [field]: typeof value === "boolean" ? (value ? 1 : 0) : value });
  }

  if (Object.keys(written).length > 0) {
    db.update(characters).set(written).where(eq(characters.id, id)).run();
  }

  return getCharacter(id);
}

export function ownsCharacter(id: string, ownerId: string): boolean {
  const row = db
    .select({ ownerId: characters.ownerId })
    .from(characters)
    .where(eq(characters.id, id))
    .get();

  return row?.ownerId === ownerId;
}

export function updateCharacterOwner(id: string, ownerId: string): CharacterCard | null {
  if (!characterExists(id)) return null;
  db.update(characters).set({ ownerId }).where(eq(characters.id, id)).run();
  forgetOwnerEmail(id);

  return getCharacter(id);
}

// Anything that changes who a character belongs to, or whether she is shared, changes
// where her media is filed — so the answer is forgotten here rather than at each
// caller, where it was already missed once.
export function adopt(id: string, ownerId: string): void {
  db.update(characters)
    .set({ ownerId })
    .where(and(eq(characters.id, id), isNull(characters.ownerId)))
    .run();

  forgetOwnerEmail(id);
}

export function setPublic(id: string, isPublic: boolean): CharacterCard | null {
  if (!characterExists(id)) return null;
  db.update(characters)
    .set({ isPublic: isPublic ? 1 : 0 })
    .where(eq(characters.id, id))
    .run();
  forgetOwnerEmail(id);

  return getCharacter(id);
}

const AUTHORED_COLUMNS = {
  avatarUrl: characters.avatarUrl,
  avatarCrop: characters.avatarCrop,
  faceUrl: characters.faceUrl,
  backgroundUrl: characters.backgroundUrl,
  themePigment: characters.themePigment,
  appearance: characters.appearance,
  defaultAffinity: characters.defaultAffinity,
  defaultMood: characters.defaultMood,
};

export function forkCharacter(
  source: CharacterCard,
  ownerId: string,
  patch: Partial<Omit<CharacterCard, "id">>,
): CharacterCard {
  const created = createCharacter({
    ...source,
    ...patch,
    name: patch.name ?? source.name,
    ownerId,
    isPublic: false,
    forkedFrom: source.id,
  });

  const authored = db
    .select(AUTHORED_COLUMNS)
    .from(characters)
    .where(eq(characters.id, source.id))
    .get();

  if (!authored) return created;

  db.update(characters).set(authored).where(eq(characters.id, created.id)).run();
  return created;
}

/**
 * The copy of a character a user talks to. A character someone else owns is forked the
 * first time it is spoken to, so from then on the conversation, the art and every later
 * edit belong to that user alone and the owner's own changes never reach them.
 *
 * Returns null when the character is already theirs and nothing needs to happen.
 */
/** The copy of a character this user already talks to, if they have one. Creates nothing. */
export function existingForkFor(characterId: string, userId: string): CharacterCard | null {
  const row = db
    .select(COLUMNS)
    .from(characters)
    .where(and(eq(characters.forkedFrom, characterId), eq(characters.ownerId, userId)))
    .get();

  return row ? toCard(row) : null;
}

export function forkForUser(characterId: string, userId: string): CharacterCard | null {
  const source = getCharacter(characterId);
  if (!source || source.ownerId === userId) return null;

  if (source.ownerId === null) {
    adopt(characterId, userId);
    return null;
  }

  const existing = existingForkFor(characterId, userId);
  if (existing) return existing;
  const fork = forkCharacter(source, userId, {});
  for (const entry of getLoreEntries(characterId)) {
    upsertLoreEntry(fork.id, {
      keys: entry.keys,
      content: entry.content,
      requiredAffinity: entry.requiredAffinity,
      isActive: entry.isActive,
    });
  }

  // Whatever this user had already seen of her comes with them — her greeting, anything
  // said before now, how she felt about them. Only their own rows move, so no one else's
  // conversation is touched and nothing is left stranded on a character they will not see
  // in their roster again.
  for (const table of [messages, characterState, stages, chronicles]) {
    db.update(table)
      .set({ characterId: fork.id })
      .where(and(eq(table.characterId, characterId), eq(table.userId, userId)))
      .run();
  }
  return fork;
}

export function deleteCharacter(id: string): boolean {
  if (!characterExists(id)) return false;
  db.delete(characters).where(eq(characters.id, id)).run();
  return true;
}
