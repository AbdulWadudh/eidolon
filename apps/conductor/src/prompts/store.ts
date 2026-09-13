import {
  defaultPrompt,
  PROMPT_DEFAULTS,
  type PromptCategory,
  type PromptDefinition,
} from "@eidolon/config";
import { eq } from "drizzle-orm";
import { CACHE } from "@/config";
import { db } from "@/db";
import { prompts } from "@/db/tables";
import { cacheDelete, cacheGet, cacheSet } from "@/services/cache";

export interface PromptRecord {
  key: string;
  value: string;
  description: string;
  category: PromptCategory | null;
  variables: string[];
  isCustom: boolean;
  updatedAt: number;
}

const memory = new Map<string, string>();
const definitions = new Map<string, PromptDefinition>(
  PROMPT_DEFAULTS.map((entry) => [entry.key, entry]),
);

function readAllFromDb(): Record<string, string> {
  const rows = db.select({ key: prompts.key, value: prompts.value }).from(prompts).all();
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

  const updatedAt = Date.now();

  db.insert(prompts)
    .values({ key, value: trimmed, updatedAt })
    .onConflictDoUpdate({ target: prompts.key, set: { value: trimmed, updatedAt } })
    .run();

  memory.set(key, trimmed);
  await cacheSet(CACHE.promptsKey, JSON.stringify(readAllFromDb()), CACHE.promptsTtlSeconds);
  return describePrompt(key);
}

export async function resetPrompt(key: string): Promise<PromptRecord> {
  if (!definitions.has(key)) throw new Error(`Unknown prompt key: ${key}`);

  db.delete(prompts).where(eq(prompts.key, key)).run();
  memory.set(key, defaultPrompt(key));
  await cacheSet(CACHE.promptsKey, JSON.stringify(readAllFromDb()), CACHE.promptsTtlSeconds);
  return describePrompt(key);
}

export function describePrompt(key: string): PromptRecord {
  const definition = definitions.get(key);
  const row = db
    .select({ value: prompts.value, updatedAt: prompts.updatedAt })
    .from(prompts)
    .where(eq(prompts.key, key))
    .get();

  return {
    key,
    value: getPrompt(key),
    description: definition?.description ?? "",
    category: definition?.category ?? null,
    variables: definition?.variables ?? [],
    isCustom: row !== undefined,
    updatedAt: row?.updatedAt ?? 0,
  };
}

export function listPrompts(): PromptRecord[] {
  return PROMPT_DEFAULTS.map((entry) => describePrompt(entry.key));
}
