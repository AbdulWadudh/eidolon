import { and, asc, desc, eq, sql } from "drizzle-orm";
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

export function getStage(
  characterId: string,
  userId: string,
  stageName: string,
): StoredStage | null {
  const row = db
    .select(COLUMNS)
    .from(stages)
    .where(
      and(
        eq(stages.characterId, characterId),
        eq(stages.userId, userId),
        eq(stages.name, stageName),
      ),
    )
    .get();
  return row ? toStage(row) : null;
}

export function listStages(characterId: string, userId: string): StoredStage[] {
  return db
    .select(COLUMNS)
    .from(stages)
    .where(and(eq(stages.characterId, characterId), eq(stages.userId, userId)))
    .orderBy(asc(sql`rowid`))
    .all()
    .map(toStage);
}

function stageValues(
  characterId: string,
  userId: string,
  stageName: string,
  backdropUrl: string | null,
) {
  return {
    characterId,
    userId,
    name: stageName,
    backdropUrl,
    lightingTint: STAGE.defaultLightingTint,
    soundscapeStems: JSON.stringify(STAGE.defaultSoundscapeStems),
    updatedAt: Date.now(),
  };
}

export function registerStage(characterId: string, userId: string, stageName: string): void {
  ensureCharacter(characterId, userId);

  db.insert(stages)
    .values(stageValues(characterId, userId, stageName, null))
    .onConflictDoNothing({ target: [stages.characterId, stages.userId, stages.name] })
    .run();
}

export function saveStageBackdrop(
  characterId: string,
  userId: string,
  stageName: string,
  backdropUrl: string,
): StoredStage {
  ensureCharacter(characterId, userId);
  const updatedAt = Date.now();

  db.insert(stages)
    .values({ ...stageValues(characterId, userId, stageName, backdropUrl), updatedAt })
    .onConflictDoUpdate({
      target: [stages.characterId, stages.userId, stages.name],
      set: { backdropUrl, updatedAt },
    })
    .run();

  const saved = getStage(characterId, userId, stageName);
  if (!saved) {
    throw new Error(`Stage "${stageName}" vanished immediately after being written.`);
  }
  return saved;
}

export function currentStage(characterId: string, userId: string): StoredStage | null {
  const row = db
    .select(COLUMNS)
    .from(stages)
    .where(and(eq(stages.characterId, characterId), eq(stages.userId, userId)))
    .orderBy(desc(stages.updatedAt), desc(sql`rowid`))
    .get();
  return row ? toStage(row) : null;
}
