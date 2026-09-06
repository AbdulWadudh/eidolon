import { db } from "@/db";

export interface Portrait {
  id: string;
  url: string;
  prompt: string | null;
  createdAt: number;
}

/**
 * Records a render. Every portrait a character has ever had is kept, so setting
 * a new profile picture never destroys the one it replaced and an older face can
 * be chosen again from her gallery.
 */
export function addPortrait(characterId: string, url: string, prompt: string | null): string {
  const id = `portrait:${crypto.randomUUID()}`;

  db.query(
    `INSERT OR IGNORE INTO character_portraits (id, character_id, url, prompt, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5)`,
  ).run(id, characterId, url, prompt, Date.now());

  return id;
}

export function listPortraits(characterId: string): Portrait[] {
  return db
    .query<{ id: string; url: string; prompt: string | null; created_at: number }, [string]>(
      `SELECT id, url, prompt, created_at FROM character_portraits
        WHERE character_id = ? ORDER BY created_at DESC`,
    )
    .all(characterId)
    .map((row) => ({
      id: row.id,
      url: row.url,
      prompt: row.prompt,
      createdAt: row.created_at,
    }));
}

export function deletePortrait(characterId: string, id: string): boolean {
  const before = db
    .query<{ total: number }, [string]>(
      "SELECT COUNT(*) as total FROM character_portraits WHERE character_id = ?",
    )
    .get(characterId);

  db.query("DELETE FROM character_portraits WHERE id = ? AND character_id = ?").run(
    id,
    characterId,
  );

  const after = db
    .query<{ total: number }, [string]>(
      "SELECT COUNT(*) as total FROM character_portraits WHERE character_id = ?",
    )
    .get(characterId);

  return (before?.total ?? 0) !== (after?.total ?? 0);
}
