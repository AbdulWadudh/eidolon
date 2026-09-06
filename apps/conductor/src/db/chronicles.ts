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

export function nextChapterIndex(characterId: string): number {
  const row = db
    .query<{ highest: number | null }, [string]>(
      "SELECT MAX(chapter_index) as highest FROM chronicles WHERE character_id = ?",
    )
    .get(characterId);
  return (row?.highest ?? 0) + 1;
}

export function appendChronicle(
  characterId: string,
  chapterIndex: number,
  summaryText: string,
): string {
  ensureCharacter(characterId);
  const id = crypto.randomUUID();
  db.query(
    `INSERT INTO chronicles (id, character_id, chapter_index, summary_text, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT(character_id, chapter_index) DO UPDATE SET
       summary_text = ?4,
       created_at = ?5`,
  ).run(id, characterId, chapterIndex, summaryText, Date.now());
  return id;
}

export function getChronicles(characterId: string, limit: number): StoredChronicle[] {
  return db
    .query<ChronicleRow, [string, number]>(
      "SELECT id, chapter_index, summary_text, created_at FROM chronicles WHERE character_id = ?1 ORDER BY chapter_index DESC LIMIT ?2",
    )
    .all(characterId, limit)
    .map(toChronicle);
}

export function countChronicles(characterId: string): number {
  const row = db
    .query<{ total: number }, [string]>(
      "SELECT COUNT(*) as total FROM chronicles WHERE character_id = ?",
    )
    .get(characterId);
  return row?.total ?? 0;
}
