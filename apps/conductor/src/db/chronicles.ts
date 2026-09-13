import { db, ensureCharacter } from "@/db";

export interface StoredChronicle {
  id: string;
  chapterIndex: number;
  summaryText: string;
  createdAt: number;
}

interface ChronicleRow {
  id: string;
  chapter_index: number;
  summary_text: string;
  created_at: number;
}

function toChronicle(row: ChronicleRow): StoredChronicle {
  return {
    id: row.id,
    chapterIndex: row.chapter_index,
    summaryText: row.summary_text,
    createdAt: row.created_at,
  };
}

export function nextChapterIndex(characterId: string, userId: string): number {
  const row = db
    .query<{ highest: number | null }, [string, string]>(
      "SELECT MAX(chapter_index) as highest FROM chronicles WHERE character_id = ?1 AND user_id = ?2",
    )
    .get(characterId, userId);
  return (row?.highest ?? 0) + 1;
}

export function appendChronicle(
  characterId: string,
  userId: string,
  chapterIndex: number,
  summaryText: string,
): string {
  ensureCharacter(characterId, userId);
  const id = crypto.randomUUID();
  db.query(
    `INSERT INTO chronicles (id, character_id, user_id, chapter_index, summary_text, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)
     ON CONFLICT(character_id, user_id, chapter_index) DO UPDATE SET
       summary_text = ?5,
       created_at = ?6`,
  ).run(id, characterId, userId, chapterIndex, summaryText, Date.now());
  return id;
}

export function getChronicles(
  characterId: string,
  userId: string,
  limit: number,
): StoredChronicle[] {
  return db
    .query<ChronicleRow, [string, string, number]>(
      "SELECT id, chapter_index, summary_text, created_at FROM chronicles WHERE character_id = ?1 AND user_id = ?2 ORDER BY chapter_index DESC LIMIT ?3",
    )
    .all(characterId, userId, limit)
    .map(toChronicle);
}

export function countChronicles(characterId: string, userId: string): number {
  const row = db
    .query<{ total: number }, [string, string]>(
      "SELECT COUNT(*) as total FROM chronicles WHERE character_id = ?1 AND user_id = ?2",
    )
    .get(characterId, userId);
  return row?.total ?? 0;
}

export function updateChronicle(chronicleId: string, summaryText: string, userId: string): boolean {
  const result = db
    .query("UPDATE chronicles SET summary_text = ?2 WHERE id = ?1 AND user_id = ?3")
    .run(chronicleId, summaryText, userId);
  return result.changes > 0;
}

export function deleteChronicle(chronicleId: string, userId: string): boolean {
  const result = db
    .query("DELETE FROM chronicles WHERE id = ?1 AND user_id = ?2")
    .run(chronicleId, userId);
  return result.changes > 0;
}

export function getChronicle(chronicleId: string, userId: string): StoredChronicle | null {
  const row = db
    .query<ChronicleRow, [string, string]>(
      "SELECT id, chapter_index, summary_text, created_at FROM chronicles WHERE id = ?1 AND user_id = ?2",
    )
    .get(chronicleId, userId);
  return row ? toChronicle(row) : null;
}
