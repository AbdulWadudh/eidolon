import { db, ensureCharacter } from "@/db";
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
  required_affinity: number;
  is_active: number;
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
    requiredAffinity: row.required_affinity,
    isActive: row.is_active === 1,
  };
}

export function getLoreEntries(characterId: string): StoredLoreEntry[] {
  return db
    .query<LoreRow, [string]>(
      "SELECT id, keys, content, required_affinity, is_active FROM lorebook_entries WHERE character_id = ?1 ORDER BY required_affinity ASC, rowid ASC",
    )
    .all(characterId)
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
  ensureCharacter(characterId);
  const entryId = id ?? crypto.randomUUID();

  db.query(
    `INSERT INTO lorebook_entries (id, character_id, keys, content, required_affinity, is_active)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(id) DO UPDATE SET
       keys = ?3,
       content = ?4,
       required_affinity = ?5,
       is_active = ?6`,
  ).run(
    entryId,
    characterId,
    JSON.stringify(entry.keys),
    entry.content,
    entry.requiredAffinity ?? 0,
    entry.isActive === false ? 0 : 1,
  );

  return entryId;
}

export function deleteLoreEntry(entryId: string): void {
  db.query("DELETE FROM lorebook_entries WHERE id = ?").run(entryId);
}
