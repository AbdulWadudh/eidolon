import { asc, eq, sql } from "drizzle-orm";
import { db, ensureCharacter } from "@/db";
import { lorebookEntries } from "@/db/tables";
import { safeJsonParse } from "@/utils/json";

export interface StoredLoreEntry {
  id: string;
  keys: string[];
  content: string;
  requiredAffinity: number;
  isActive: boolean;
}

interface LoreRow {
  id: string;
  keys: string;
  content: string;
  requiredAffinity: number | null;
  isActive: number | null;
}

function toEntry(row: LoreRow): StoredLoreEntry {
  const parsed = safeJsonParse<unknown>(row.keys, []);
  const keys = Array.isArray(parsed)
    ? parsed.filter((key): key is string => typeof key === "string" && key.trim().length > 0)
    : [];

  return {
    id: row.id,
    keys,
    content: row.content,
    requiredAffinity: row.requiredAffinity ?? 0,
    isActive: row.isActive === 1,
  };
}

export function getLoreEntries(characterId: string): StoredLoreEntry[] {
  return db
    .select({
      id: lorebookEntries.id,
      keys: lorebookEntries.keys,
      content: lorebookEntries.content,
      requiredAffinity: lorebookEntries.requiredAffinity,
      isActive: lorebookEntries.isActive,
    })
    .from(lorebookEntries)
    .where(eq(lorebookEntries.characterId, characterId))
    .orderBy(asc(lorebookEntries.requiredAffinity), asc(sql`rowid`))
    .all()
    .map(toEntry);
}

export function getActiveLoreEntries(characterId: string): StoredLoreEntry[] {
  return getLoreEntries(characterId).filter((entry) => entry.isActive);
}

export interface NewLoreEntry {
  keys: string[];
  content: string;
  requiredAffinity?: number;
  isActive?: boolean;
}

export function upsertLoreEntry(characterId: string, entry: NewLoreEntry, id?: string): string {
  ensureCharacter(characterId, null);

  const entryId = id ?? crypto.randomUUID();
  const written = {
    keys: JSON.stringify(entry.keys),
    content: entry.content,
    requiredAffinity: entry.requiredAffinity ?? 0,
    isActive: entry.isActive === false ? 0 : 1,
  };

  db.insert(lorebookEntries)
    .values({ id: entryId, characterId, ...written })
    .onConflictDoUpdate({ target: lorebookEntries.id, set: written })
    .run();

  return entryId;
}

export function deleteLoreEntry(entryId: string): void {
  db.delete(lorebookEntries).where(eq(lorebookEntries.id, entryId)).run();
}
