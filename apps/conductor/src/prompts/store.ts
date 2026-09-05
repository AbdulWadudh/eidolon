import { CACHE, defaultPrompt, PROMPT_DEFAULTS, type PromptDefinition } from "@eidolon/config";
import { db } from "@/db";
import { cacheDelete, cacheGet, cacheSet } from "@/services/cache";

export interface PromptRecord {
  key: string;
  value: string;
  description: string;
  variables: string[];
  isCustom: boolean;
  updatedAt: number;
}

db.exec(`
  CREATE TABLE IF NOT EXISTS prompts (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

const memory = new Map<string, string>();
const definitions = new Map<string, PromptDefinition>(
  PROMPT_DEFAULTS.map((entry) => [entry.key, entry]),
);

function readAllFromDb(): Record<string, string> {
  const rows = db.query("SELECT key, value FROM prompts").all() as {
    key: string;
    value: string;
  }[];
  return Object.fromEntries(rows.map((row) => [row.key, row.value]));
}

function hydrate(source: Record<string, string>): void {
  memory.clear();
  for (const entry of PROMPT_DEFAULTS) {
    memory.set(entry.key, source[entry.key] ?? entry.value);
  }
}

export async function loadPrompts(): Promise<void> {
  const cached = await cacheGet(CACHE.promptsKey);
  if (cached) {
    try {
      hydrate(JSON.parse(cached) as Record<string, string>);
      return;
    } catch {
      await cacheDelete(CACHE.promptsKey);
    }
  }

  const stored = readAllFromDb();
  hydrate(stored);
  await cacheSet(CACHE.promptsKey, JSON.stringify(stored), CACHE.promptsTtlSeconds);
}

export function getPrompt(key: string): string {
  return memory.get(key) ?? defaultPrompt(key);
}

export async function setPrompt(key: string, value: string): Promise<PromptRecord> {
  if (!definitions.has(key)) throw new Error(`Unknown prompt key: ${key}`);

  const trimmed = value.trim();
  if (trimmed.length === 0) throw new Error("A prompt cannot be empty.");

  db.query(
    `INSERT INTO prompts (key, value, updated_at) VALUES (?1, ?2, ?3)
     ON CONFLICT(key) DO UPDATE SET value = ?2, updated_at = ?3`,
  ).run(key, trimmed, Date.now());

  memory.set(key, trimmed);
  await cacheSet(CACHE.promptsKey, JSON.stringify(readAllFromDb()), CACHE.promptsTtlSeconds);
  return describePrompt(key);
}

export async function resetPrompt(key: string): Promise<PromptRecord> {
  if (!definitions.has(key)) throw new Error(`Unknown prompt key: ${key}`);

  db.query("DELETE FROM prompts WHERE key = ?").run(key);
  memory.set(key, defaultPrompt(key));
  await cacheSet(CACHE.promptsKey, JSON.stringify(readAllFromDb()), CACHE.promptsTtlSeconds);
  return describePrompt(key);
}

export function describePrompt(key: string): PromptRecord {
  const definition = definitions.get(key);
  const row = db.query("SELECT value, updated_at FROM prompts WHERE key = ?").get(key) as {
    value: string;
    updated_at: number;
  } | null;

  return {
    key,
    value: getPrompt(key),
    description: definition?.description ?? "",
    variables: definition?.variables ?? [],
    isCustom: row !== null,
    updatedAt: row?.updated_at ?? 0,
  };
}

export function listPrompts(): PromptRecord[] {
  return PROMPT_DEFAULTS.map((entry) => describePrompt(entry.key));
}
