import { db } from "@/db";

export type GalleryKind = "photo" | "portrait" | "backdrop";

export interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  kind: GalleryKind;
  createdAt: number;
  /** True for the portrait currently in use as her profile picture. */
  isAvatar: boolean;
}

interface Row {
  id: string;
  url: string;
  caption: string | null;
  kind: string;
  created_at: number;
  seq: number;
}

/**
 * Everything ever rendered for a character: the photos she sent in chat, every
 * portrait she has ever had, and her stage backdrops.
 *
 * Portraits come from `character_portraits` rather than `characters.avatar_url`,
 * so generating a new one adds to her history instead of replacing it and an
 * older face can be picked again. Backdrops carry no timestamp of their own —
 * `stages` never had one — so they borrow the character's, which puts them at
 * the beginning of her history rather than at an arbitrary point in it.
 */
const SOURCES = `
  SELECT m.id AS id, m.image_url AS url, m.image_caption AS caption,
         'photo' AS kind, m.created_at AS created_at, m.rowid AS seq
    FROM messages m
   WHERE m.character_id = ?1 AND m.image_url IS NOT NULL AND m.image_url != ''
  UNION ALL
  SELECT p.id, p.url, p.prompt, 'portrait', p.created_at, p.rowid
    FROM character_portraits p
   WHERE p.character_id = ?1
  UNION ALL
  SELECT 'stage:' || s.id, s.backdrop_url, s.name, 'backdrop',
         COALESCE((SELECT created_at FROM characters WHERE id = ?1), 0), s.rowid
    FROM stages s
   WHERE s.character_id = ?1 AND s.backdrop_url IS NOT NULL AND s.backdrop_url != ''
`;

function currentAvatar(characterId: string): string | null {
  const row = db
    .query<{ avatar_url: string | null }, [string]>(
      "SELECT avatar_url FROM characters WHERE id = ?",
    )
    .get(characterId);

  return row?.avatar_url ?? null;
}

export function listGallery(characterId: string, limit: number, offset = 0): GalleryImage[] {
  const avatar = currentAvatar(characterId);

  return db
    .query<Row, [string, number, number]>(
      `SELECT * FROM (${SOURCES}) ORDER BY created_at DESC, seq DESC, id DESC LIMIT ?2 OFFSET ?3`,
    )
    .all(characterId, limit, offset)
    .map((row) => ({
      id: row.id,
      url: row.url,
      caption: row.caption,
      kind: row.kind as GalleryKind,
      createdAt: row.created_at,
      isAvatar: avatar !== null && row.url === avatar,
    }));
}

export function countGallery(characterId: string): number {
  const row = db
    .query<{ total: number }, [string]>(`SELECT COUNT(*) AS total FROM (${SOURCES})`)
    .get(characterId);

  return row?.total ?? 0;
}
