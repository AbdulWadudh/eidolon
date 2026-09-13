import { eq } from "drizzle-orm";
import { db } from "@/db";
import { characters } from "@/db/tables";

export interface CharacterLook {
  avatarUrl: string | null;
  avatarCrop: unknown | null;
  backgroundUrl: string | null;
  faceUrl: string | null;
  outfit: string | null;
}

function field<T>(characterId: string, column: Parameters<typeof db.select>[0]): T | undefined {
  return db.select(column).from(characters).where(eq(characters.id, characterId)).get() as
    | T
    | undefined;
}

function write(characterId: string, patch: Partial<typeof characters.$inferInsert>): void {
  db.update(characters).set(patch).where(eq(characters.id, characterId)).run();
}

export function getCharacterLook(characterId: string): CharacterLook {
  const row = db
    .select({
      avatarUrl: characters.avatarUrl,
      avatarCrop: characters.avatarCrop,
      backgroundUrl: characters.backgroundUrl,
      faceUrl: characters.faceUrl,
      outfit: characters.outfit,
    })
    .from(characters)
    .where(eq(characters.id, characterId))
    .get();

  return {
    avatarUrl: row?.avatarUrl ?? null,
    avatarCrop: row?.avatarCrop ? JSON.parse(row.avatarCrop) : null,
    backgroundUrl: row?.backgroundUrl ?? null,
    faceUrl: row?.faceUrl ?? null,
    outfit: row?.outfit ?? null,
  };
}

export function setCharacterAvatarCrop(characterId: string, crop: unknown | null): void {
  write(characterId, { avatarCrop: crop === null ? null : JSON.stringify(crop) });
}

export function setCharacterFace(characterId: string, faceUrl: string | null): void {
  write(characterId, { faceUrl });
}

export function setCharacterBackground(characterId: string, backgroundUrl: string | null): void {
  write(characterId, { backgroundUrl, backgroundChosen: backgroundUrl ? 1 : 0 });
}

export function setStageBackground(characterId: string, backgroundUrl: string | null): void {
  write(characterId, { backgroundUrl });
}

export function hasChosenBackground(characterId: string): boolean {
  return (
    field<{ backgroundChosen: number | null }>(characterId, {
      backgroundChosen: characters.backgroundChosen,
    })?.backgroundChosen === 1
  );
}

export function getCharacterAvatar(characterId: string): string | null {
  return (
    field<{ avatarUrl: string | null }>(characterId, { avatarUrl: characters.avatarUrl })
      ?.avatarUrl ?? null
  );
}

export function setCharacterAvatar(characterId: string, avatarUrl: string): void {
  write(characterId, { avatarUrl });
}

export function setCharacterPigment(characterId: string, pigment: string | null): void {
  write(characterId, { themePigment: pigment });
}

export function getCharacterPigment(characterId: string): string | null {
  return (
    field<{ themePigment: string | null }>(characterId, {
      themePigment: characters.themePigment,
    })?.themePigment ?? null
  );
}

export function setCharacterAppearance(characterId: string, appearance: string): void {
  write(characterId, { appearance });
}

export function getCharacterAppearance(characterId: string): string | null {
  return (
    field<{ appearance: string | null }>(characterId, { appearance: characters.appearance })
      ?.appearance ?? null
  );
}

export function setCharacterOutfit(characterId: string, outfit: string | null): void {
  write(characterId, { outfit });
}

export function getCharacterOutfit(characterId: string): string | null {
  return (
    field<{ outfit: string | null }>(characterId, { outfit: characters.outfit })?.outfit ?? null
  );
}
