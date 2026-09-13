import { DEFAULT_PRONOUNS, isPronounKey } from "@eidolon/config";
import { and, count, desc, eq, isNull, or } from "drizzle-orm";
import { kebabCase } from "es-toolkit";
import { VOICE } from "@/config";
import { countMessages, db, getCharacterMind } from "@/db";
import { characters, messages } from "@/db/tables";
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
    ownerId: row.ownerId,
    isPublic: row.isPublic === 1,
    forkedFrom: row.forkedFrom,
  };
}

export function characterIdFor(name: string, taken: (id: string) => boolean): string {
  const base = kebabCase(name.trim()) || "character";
  if (!taken(base)) return base;

  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`;
    if (!taken(candidate)) return candidate;
  }

  return `${base}-${crypto.randomUUID().slice(0, 8)}`;
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
  const visible = ownerId
    ? or(eq(characters.ownerId, ownerId), eq(characters.isPublic, 1))
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
  const id = characterIdFor(draft.name, characterExists);

  db.insert(characters)
    .values({
      id,
      name: draft.name.trim(),
      tagline: draft.tagline ?? "",
      personality: draft.personality ?? "",
      systemPrompt: draft.systemPrompt ?? "",
      scenario: draft.scenario ?? "",
      rules: draft.rules ?? "",
      exampleDialogue: draft.exampleDialogue ?? "",
      greeting: draft.greeting ?? "",
      voice: draft.voice ?? VOICE.defaultId,
      pronouns: isPronounKey(draft.pronouns)
        ? draft.pronouns.trim().toLowerCase()
        : DEFAULT_PRONOUNS,
      ownerId: draft.ownerId ?? null,
      isPublic: draft.isPublic ? 1 : 0,
      forkedFrom: draft.forkedFrom ?? null,
      createdAt: Date.now(),
    })
    .run();

  const created = getCharacter(id);
  if (!created) throw new Error(`Character "${id}" vanished immediately after being written.`);
  return created;
}

type EditableField = keyof Omit<CharacterCard, "id" | "ownerId" | "forkedFrom">;

const EDITABLE: EditableField[] = [
  "name",
  "tagline",
  "personality",
  "systemPrompt",
  "scenario",
  "rules",
  "exampleDialogue",
  "greeting",
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

export function adopt(id: string, ownerId: string): void {
  db.update(characters)
    .set({ ownerId })
    .where(and(eq(characters.id, id), isNull(characters.ownerId)))
    .run();
}

export function setPublic(id: string, isPublic: boolean): CharacterCard | null {
  if (!characterExists(id)) return null;
  db.update(characters)
    .set({ isPublic: isPublic ? 1 : 0 })
    .where(eq(characters.id, id))
    .run();
  return getCharacter(id);
}

export function forkCharacter(
  source: CharacterCard,
  ownerId: string,
  patch: Partial<Omit<CharacterCard, "id">>,
): CharacterCard {
  return createCharacter({
    ...source,
    ...patch,
    name: patch.name ?? source.name,
    ownerId,
    isPublic: false,
    forkedFrom: source.id,
  });
}

export function deleteCharacter(id: string): boolean {
  if (!characterExists(id)) return false;
  db.delete(characters).where(eq(characters.id, id)).run();
  return true;
}
