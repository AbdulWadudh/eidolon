import { db } from "@/db";

export interface CharacterLook {
  avatarUrl: string | null;
  avatarCrop: unknown | null;
  backgroundUrl: string | null;
  faceUrl: string | null;
}

export function getCharacterLook(characterId: string): CharacterLook {
  const row = db
    .query("SELECT avatar_url, avatar_crop, background_url, face_url FROM characters WHERE id = ?")
    .get(characterId) as
    | {
        avatar_url: string | null;
        avatar_crop: string | null;
        background_url: string | null;
        face_url: string | null;
      }
    | undefined;

  return {
    avatarUrl: row?.avatar_url ?? null,
    avatarCrop: row?.avatar_crop ? JSON.parse(row.avatar_crop) : null,
    backgroundUrl: row?.background_url ?? null,
    faceUrl: row?.face_url ?? null,
  };
}

export function setCharacterAvatarCrop(characterId: string, crop: unknown | null): void {
  db.query("UPDATE characters SET avatar_crop = ?1 WHERE id = ?2").run(
    crop === null ? null : JSON.stringify(crop),
    characterId,
  );
}

export function setCharacterFace(characterId: string, faceUrl: string | null): void {
  db.query("UPDATE characters SET face_url = ?1 WHERE id = ?2").run(faceUrl, characterId);
}

export function setCharacterBackground(characterId: string, backgroundUrl: string | null): void {
  db.query("UPDATE characters SET background_url = ?1 WHERE id = ?2").run(
    backgroundUrl,
    characterId,
  );
}

export function getCharacterAvatar(characterId: string): string | null {
  const row = db.query("SELECT avatar_url FROM characters WHERE id = ?").get(characterId) as
    | { avatar_url: string | null }
    | undefined;
  return row?.avatar_url ?? null;
}

export function setCharacterAvatar(characterId: string, avatarUrl: string): void {
  db.query("UPDATE characters SET avatar_url = ?1 WHERE id = ?2").run(avatarUrl, characterId);
}

export function setCharacterPigment(characterId: string, pigment: string | null): void {
  db.query("UPDATE characters SET theme_pigment = ?1 WHERE id = ?2").run(pigment, characterId);
}

export function getCharacterPigment(characterId: string): string | null {
  const row = db.query("SELECT theme_pigment FROM characters WHERE id = ?").get(characterId) as
    | { theme_pigment: string | null }
    | undefined;
  return row?.theme_pigment ?? null;
}

export function setCharacterAppearance(characterId: string, appearance: string): void {
  db.query("UPDATE characters SET appearance = ?1 WHERE id = ?2").run(appearance, characterId);
}

export function getCharacterAppearance(characterId: string): string | null {
  const row = db.query("SELECT appearance FROM characters WHERE id = ?").get(characterId) as
    | { appearance: string | null }
    | undefined;
  return row?.appearance ?? null;
}
