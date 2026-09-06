import { VOICE } from "@eidolon/config";
import { kebabCase } from "es-toolkit";
import { db } from "@/db";

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

interface CharacterRow {
  id: string;
  name: string;
  tagline: string | null;
  personality: string | null;
  system_prompt: string | null;
  scenario: string | null;
  rules: string | null;
  example_dialogue: string | null;
  greeting: string | null;
  voice: string | null;
  owner_id: string | null;
  is_public: number | null;
  forked_from: string | null;
  avatar_url: string | null;
  affinity_score: number | null;
  affinity_tier: string | null;
  current_mood: string | null;
  created_at: number;
}

const COLUMNS = `id, name, tagline, personality, system_prompt, scenario, rules,
  example_dialogue, greeting, voice, owner_id, is_public, forked_from, avatar_url,
  affinity_score, affinity_tier, current_mood, created_at`;

function toCard(row: CharacterRow): CharacterCard {
  return {
    id: row.id,
    name: row.name,
    tagline: row.tagline ?? "",
    personality: row.personality ?? "",
    systemPrompt: row.system_prompt ?? "",
    scenario: row.scenario ?? "",
    rules: row.rules ?? "",
    exampleDialogue: row.example_dialogue ?? "",
    greeting: row.greeting ?? "",
    voice: row.voice ?? VOICE.defaultId,
    ownerId: row.owner_id,
    isPublic: row.is_public === 1,
    forkedFrom: row.forked_from,
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
  return db.query("SELECT 1 FROM characters WHERE id = ?").get(id) !== null;
}

export function getCharacter(id: string): CharacterCard | null {
  const row = db
    .query<CharacterRow, [string]>(`SELECT ${COLUMNS} FROM characters WHERE id = ?`)
    .get(id);
  return row ? toCard(row) : null;
}

export function listCharacters(ownerId?: string): CharacterSummary[] {
  // Yours, anything published, and anything from before ownership existed.
  const rows = ownerId
    ? db
        .query<CharacterRow, [string]>(
          `SELECT ${COLUMNS} FROM characters
           WHERE owner_id = ?1 OR owner_id IS NULL OR is_public = 1
           ORDER BY created_at DESC`,
        )
        .all(ownerId)
    : db
        .query<CharacterRow, []>(`SELECT ${COLUMNS} FROM characters ORDER BY created_at DESC`)
        .all();

  return rows.map((row) => {
    const counted = db
      .query<{ total: number }, [string]>(
        "SELECT COUNT(*) as total FROM messages WHERE character_id = ?",
      )
      .get(row.id);

    return {
      ...toCard(row),
      avatarUrl: row.avatar_url,
      affinity: row.affinity_score ?? 0,
      tier: row.affinity_tier ?? "",
      mood: row.current_mood ?? "",
      messageCount: counted?.total ?? 0,
      createdAt: row.created_at,
    };
  });
}

export type CharacterDraft = Partial<Omit<CharacterCard, "id">> & { name: string };

export function createCharacter(draft: CharacterDraft): CharacterCard {
  const id = characterIdFor(draft.name, characterExists);

  db.query(
    `INSERT INTO characters
       (id, name, tagline, personality, system_prompt, scenario, rules,
        example_dialogue, greeting, voice, owner_id, is_public, forked_from, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11, ?12, ?13, ?14)`,
  ).run(
    id,
    draft.name.trim(),
    draft.tagline ?? "",
    draft.personality ?? "",
    draft.systemPrompt ?? "",
    draft.scenario ?? "",
    draft.rules ?? "",
    draft.exampleDialogue ?? "",
    draft.greeting ?? "",
    draft.voice ?? VOICE.defaultId,
    draft.ownerId ?? null,
    draft.isPublic ? 1 : 0,
    draft.forkedFrom ?? null,
    Date.now(),
  );

  const created = getCharacter(id);
  if (!created) throw new Error(`Character "${id}" vanished immediately after being written.`);
  return created;
}

type EditableField = keyof Omit<CharacterCard, "id" | "ownerId" | "forkedFrom">;

// Ownership is never editable through a patch body. It is set when a character
// is created or forked and changed only by the publish endpoint.
const EDITABLE: Record<EditableField, string> = {
  name: "name",
  tagline: "tagline",
  personality: "personality",
  systemPrompt: "system_prompt",
  scenario: "scenario",
  rules: "rules",
  exampleDialogue: "example_dialogue",
  greeting: "greeting",
  voice: "voice",
  isPublic: "is_public",
};

export function updateCharacter(
  id: string,
  patch: Partial<Omit<CharacterCard, "id">>,
): CharacterCard | null {
  if (!characterExists(id)) return null;

  for (const [field, column] of Object.entries(EDITABLE)) {
    const value = patch[field as EditableField];
    if (value === undefined) continue;
    db.query(`UPDATE characters SET ${column} = ?2 WHERE id = ?1`).run(
      id,
      typeof value === "boolean" ? (value ? 1 : 0) : value,
    );
  }

  return getCharacter(id);
}

export function ownsCharacter(id: string, ownerId: string): boolean {
  const row = db
    .query<{ owner_id: string | null }, [string]>("SELECT owner_id FROM characters WHERE id = ?")
    .get(id);

  // A character from before ownership existed has no owner. The first person to
  // reach for it adopts it rather than being locked out of their own roster.
  return row !== null && (row.owner_id === null || row.owner_id === ownerId);
}

export function adopt(id: string, ownerId: string): void {
  db.query("UPDATE characters SET owner_id = ?2 WHERE id = ?1 AND owner_id IS NULL").run(
    id,
    ownerId,
  );
}

export function setPublic(id: string, isPublic: boolean): CharacterCard | null {
  if (!characterExists(id)) return null;
  db.query("UPDATE characters SET is_public = ?2 WHERE id = ?1").run(id, isPublic ? 1 : 0);
  return getCharacter(id);
}

/**
 * Forking is what happens when someone edits a character they did not author:
 * their version is theirs, the original is untouched, and the lore comes with it
 * because a character without her secrets is not the same character.
 */
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
  db.query("DELETE FROM characters WHERE id = ?").run(id);
  return true;
}
