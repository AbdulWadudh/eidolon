import { AFFINITY, CHRONICLE_CONTEXT, TRANSCRIPT } from "@eidolon/config";
import { getCharacterMind, isAffinityLocked, saveCharacterMind, setAffinityLock } from "@/db";
import { getChronicles, type StoredChronicle } from "@/db/chronicles";
import { getLoreEntries } from "@/db/lorebook";
import { affinityTier, clampScore } from "@/services/affinity-ladder";

export interface LoreView {
  id: string;
  keys: string[];
  content: string | null;
  requiredAffinity: number;
  requiredTier: string;
  isActive: boolean;
  isUnlocked: boolean;
}

export interface ChapterView {
  id: string;
  chapterIndex: number;
  bullets: string[];
  createdAt: number;
}

export interface MindView {
  character: {
    id: string;
    affinity: number;
    tier: string;
    mood: string;
    isLocked: boolean;
    min: number;
    max: number;
  };
  chapters: ChapterView[];
  lore: LoreView[];
}

export function toChapterView(entry: StoredChronicle): ChapterView {
  return {
    id: entry.id,
    chapterIndex: entry.chapterIndex,
    bullets: entry.summaryText
      .split(/\r?\n/)
      .map((line) => line.replace(/^\s*-\s*/, "").trim())
      .filter((line) => line.length > 0),
    createdAt: entry.createdAt,
  };
}

export function buildMindView(characterId: string): MindView {
  const mind = getCharacterMind(characterId);

  return {
    character: {
      id: characterId,
      affinity: mind.score,
      tier: mind.tier,
      mood: mind.mood,
      isLocked: isAffinityLocked(characterId),
      min: AFFINITY.min,
      max: AFFINITY.max,
    },
    chapters: getChronicles(characterId, TRANSCRIPT.pageSize)
      .slice(0, CHRONICLE_CONTEXT.activeChapters * 4)
      .map(toChapterView),
    lore: getLoreEntries(characterId).map((entry) => {
      const isUnlocked = entry.requiredAffinity <= mind.score;
      return {
        id: entry.id,
        keys: isUnlocked ? entry.keys : [],
        content: isUnlocked ? entry.content : null,
        requiredAffinity: entry.requiredAffinity,
        requiredTier: affinityTier(entry.requiredAffinity),
        isActive: entry.isActive,
        isUnlocked,
      };
    }),
  };
}

export interface AffinityOverride {
  score?: number;
  locked?: boolean;
}

export function applyAffinityOverride(characterId: string, override: AffinityOverride): MindView {
  if (typeof override.locked === "boolean") {
    setAffinityLock(characterId, override.locked);
  }

  if (typeof override.score === "number" && Number.isFinite(override.score)) {
    const score = clampScore(Math.round(override.score));
    const current = getCharacterMind(characterId);
    saveCharacterMind(characterId, {
      score,
      tier: affinityTier(score),
      mood: current.mood,
    });
  }

  return buildMindView(characterId);
}
