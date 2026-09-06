import { STAGE } from "@eidolon/config";
import { db, ensureCharacter } from "@/db";
import { safeJsonParse } from "@/utils/json";

export interface StoredStage {
  id: string;
  name: string;
  backdropUrl: string | null;
  lightingTint: string;
  soundscapeStems: string[];
}

interface StageRow {
  id: string;
  name: string;
  backdrop_url: string | null;
  lighting_tint: string | null;
  soundscape_stems: string | null;
}

function toStage(row: StageRow): StoredStage {
  return {
    id: row.id,
    name: row.name,
    backdropUrl: row.backdrop_url,
    lightingTint: row.lighting_tint ?? STAGE.defaultLightingTint,
    soundscapeStems: safeJsonParse<string[]>(row.soundscape_stems ?? "[]", []),
  };
}

export function getStage(characterId: string, stageName: string): StoredStage | null {
  const row = db
    .query<StageRow, [string, string]>(
      "SELECT id, name, backdrop_url, lighting_tint, soundscape_stems FROM stages WHERE character_id = ?1 AND name = ?2",
    )
    .get(characterId, stageName);
  return row ? toStage(row) : null;
}

export function getCurrentStage(characterId: string): StoredStage | null {
  const row = db
    .query<StageRow, [string]>(
      "SELECT id, name, backdrop_url, lighting_tint, soundscape_stems FROM stages WHERE character_id = ?1 ORDER BY updated_at DESC, rowid DESC LIMIT 1",
    )
    .get(characterId);
  return row ? toStage(row) : null;
}

export function listStages(characterId: string): StoredStage[] {
  return db
    .query<StageRow, [string]>(
      "SELECT id, name, backdrop_url, lighting_tint, soundscape_stems FROM stages WHERE character_id = ?1 ORDER BY rowid ASC",
    )
    .all(characterId)
    .map(toStage);
}

export function registerStage(characterId: string, stageName: string): void {
  ensureCharacter(characterId);

  db.query(
    `INSERT INTO stages (id, character_id, name, backdrop_url, lighting_tint, soundscape_stems, updated_at)
     VALUES (?1, ?2, ?3, NULL, ?4, ?5, ?6)
     ON CONFLICT(character_id, name) DO NOTHING`,
  ).run(
    crypto.randomUUID(),
    characterId,
    stageName,
    STAGE.defaultLightingTint,
    JSON.stringify(STAGE.defaultSoundscapeStems),
    Date.now(),
  );
}

export function saveStageBackdrop(
  characterId: string,
  stageName: string,
  backdropUrl: string,
): StoredStage {
  ensureCharacter(characterId);

  db.query(
    `INSERT INTO stages (id, character_id, name, backdrop_url, lighting_tint, soundscape_stems, updated_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)
     ON CONFLICT(character_id, name) DO UPDATE SET
       backdrop_url = ?4,
       updated_at = ?7`,
  ).run(
    crypto.randomUUID(),
    characterId,
    stageName,
    backdropUrl,
    STAGE.defaultLightingTint,
    JSON.stringify(STAGE.defaultSoundscapeStems),
    Date.now(),
  );

  const saved = getStage(characterId, stageName);
  if (!saved) {
    throw new Error(`Stage "${stageName}" vanished immediately after being written.`);
  }
  return saved;
}
