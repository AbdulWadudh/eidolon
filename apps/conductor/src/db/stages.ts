import { and, asc, eq, sql } from "drizzle-orm";
import { STAGE } from "@/config";
import { db, ensureCharacter } from "@/db";
import { stages } from "@/db/tables";
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
  backdropUrl: string | null;
  lightingTint: string | null;
  soundscapeStems: string | null;
}

const COLUMNS = {
  id: stages.id,
  name: stages.name,
  backdropUrl: stages.backdropUrl,
  lightingTint: stages.lightingTint,
  soundscapeStems: stages.soundscapeStems,
};

function toStage(row: StageRow): StoredStage {
  return {
    id: row.id,
    name: row.name,
    backdropUrl: row.backdropUrl,
    lightingTint: row.lightingTint ?? STAGE.defaultLightingTint,
    soundscapeStems: safeJsonParse<string[]>(row.soundscapeStems ?? "[]", []),
  };
}

export function getStage(characterId: string, stageName: string): StoredStage | null {
  const row = db
    .select(COLUMNS)
    .from(stages)
    .where(and(eq(stages.characterId, characterId), eq(stages.name, stageName)))
    .get();
  return row ? toStage(row) : null;
}

export function listStages(characterId: string): StoredStage[] {
  return db
    .select(COLUMNS)
    .from(stages)
    .where(eq(stages.characterId, characterId))
    .orderBy(asc(sql`rowid`))
    .all()
    .map(toStage);
}

function stageValues(characterId: string, stageName: string, backdropUrl: string | null) {
  return {
    id: crypto.randomUUID(),
    characterId,
    name: stageName,
    backdropUrl,
    lightingTint: STAGE.defaultLightingTint,
    soundscapeStems: JSON.stringify(STAGE.defaultSoundscapeStems),
    updatedAt: Date.now(),
  };
}

export function registerStage(characterId: string, stageName: string): void {
  ensureCharacter(characterId, null);

  db.insert(stages)
    .values(stageValues(characterId, stageName, null))
    .onConflictDoNothing({ target: [stages.characterId, stages.name] })
    .run();
}

export function saveStageBackdrop(
  characterId: string,
  stageName: string,
  backdropUrl: string,
): StoredStage {
  ensureCharacter(characterId, null);
  const updatedAt = Date.now();

  db.insert(stages)
    .values({ ...stageValues(characterId, stageName, backdropUrl), updatedAt })
    .onConflictDoUpdate({
      target: [stages.characterId, stages.name],
      set: { backdropUrl, updatedAt },
    })
    .run();

  const saved = getStage(characterId, stageName);
  if (!saved) {
    throw new Error(`Stage "${stageName}" vanished immediately after being written.`);
  }
  return saved;
}
