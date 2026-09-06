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
  avatar_url: string | null;
  affinity_score: number | null;
  affinity_tier: string | null;
  current_mood: string | null;
  created_at: number;
}

const COLUMNS = `id, name, tagline, personality, system_prompt, scenario, rules,
  example_dialogue, greeting, avatar_url, affinity_score, affinity_tier, current_mood, created_at`;

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

export function listCharacters(): CharacterSummary[] {
  const rows = db
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
        example_dialogue, greeting, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`,
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
    Date.now(),
  );

  const created = getCharacter(id);
  if (!created) throw new Error(`Character "${id}" vanished immediately after being written.`);
  return created;
}

const EDITABLE: Record<keyof Omit<CharacterCard, "id">, string> = {
  name: "name",
  tagline: "tagline",
  personality: "personality",
  systemPrompt: "system_prompt",
  scenario: "scenario",
  rules: "rules",
  exampleDialogue: "example_dialogue",
  greeting: "greeting",
};

export function updateCharacter(
  id: string,
  patch: Partial<Omit<CharacterCard, "id">>,
): CharacterCard | null {
  if (!characterExists(id)) return null;

  for (const [field, column] of Object.entries(EDITABLE)) {
    const value = patch[field as keyof typeof EDITABLE];
    if (value === undefined) continue;
    db.query(`UPDATE characters SET ${column} = ?2 WHERE id = ?1`).run(id, value);
  }

  return getCharacter(id);
}

export function deleteCharacter(id: string): boolean {
  if (!characterExists(id)) return false;
  db.query("DELETE FROM characters WHERE id = ?").run(id);
  return true;
}
