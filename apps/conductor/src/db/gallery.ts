import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/tables";

export type GalleryKind = "photo" | "portrait" | "backdrop";

export interface GalleryImage {
  id: string;
  url: string;
  caption: string | null;
  kind: GalleryKind;
  createdAt: number;
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

const sources = (characterId: string, userId: string) => sql`
  SELECT m.id AS id, m.image_url AS url, m.image_caption AS caption,
         'photo' AS kind, m.created_at AS created_at, m.rowid AS seq
    FROM messages m
   WHERE m.character_id = ${characterId} AND m.user_id = ${userId}
     AND m.image_url IS NOT NULL AND m.image_url != ''
  UNION ALL
  SELECT p.id, p.url, p.prompt, 'portrait', p.created_at, p.rowid
    FROM character_portraits p
   WHERE p.character_id = ${characterId}
  UNION ALL
  SELECT 'stage:' || s.id, s.backdrop_url, s.name, 'backdrop',
         COALESCE((SELECT created_at FROM characters WHERE id = ${characterId}), 0), s.rowid
    FROM stages s
   WHERE s.character_id = ${characterId} AND s.backdrop_url IS NOT NULL AND s.backdrop_url != ''
`;

function currentAvatar(characterId: string): string | null {
  return (
    db
      .select({ avatarUrl: characters.avatarUrl })
      .from(characters)
      .where(eq(characters.id, characterId))
      .get()?.avatarUrl ?? null
  );
}

export function listGallery(
  characterId: string,
  userId: string,
  limit: number,
  offset = 0,
): GalleryImage[] {
  const avatar = currentAvatar(characterId);

  return db
    .all<Row>(
      sql`SELECT * FROM (${sources(characterId, userId)})
          ORDER BY created_at DESC, seq DESC, id DESC
          LIMIT ${limit} OFFSET ${offset}`,
    )
    .map((row) => ({
      id: row.id,
      url: row.url,
      caption: row.caption,
      kind: row.kind as GalleryKind,
      createdAt: row.created_at,
      isAvatar: avatar !== null && row.url === avatar,
    }));
}

export function countGallery(characterId: string, userId: string): number {
  const [row] = db.all<{ total: number }>(
    sql`SELECT COUNT(*) AS total FROM (${sources(characterId, userId)})`,
  );

  return row?.total ?? 0;
}
