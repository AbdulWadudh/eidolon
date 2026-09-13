import { AFFINITY, TRANSCRIPT } from "@/config";
import {
  getCharacterCard,
  getCharacterMind,
  isAffinityLocked,
  saveCharacterMind,
  setAffinityLock,
} from "@/db";
import { getChronicles, type StoredChronicle } from "@/db/chronicles";
import { getLoreEntries } from "@/db/lorebook";
import { resolveMood } from "@/orchestrator/prompt-builder";
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
    pronouns: string;
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

export function buildMindView(characterId: string, userId: string): MindView {
  const mind = getCharacterMind(characterId, userId);

  return {
    character: {
      id: characterId,
      affinity: mind.score,
      tier: mind.tier,
      mood: mind.mood,
      pronouns: getCharacterCard(characterId, userId).pronouns,
      isLocked: isAffinityLocked(characterId, userId),
      min: AFFINITY.min,
      max: AFFINITY.max,
    },
    chapters: getChronicles(characterId, userId, TRANSCRIPT.pageSize).map(toChapterView),
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
  mood?: string;
}

export function applyAffinityOverride(
  characterId: string,
  userId: string,
  override: AffinityOverride,
): MindView {
  if (typeof override.locked === "boolean") {
    setAffinityLock(characterId, userId, override.locked);
  }

  const mood = resolveMood(override.mood);
  const hasScore = typeof override.score === "number" && Number.isFinite(override.score);

  if (hasScore || mood) {
    const current = getCharacterMind(characterId, userId);
    const score = hasScore ? clampScore(Math.round(override.score as number)) : current.score;
    saveCharacterMind(characterId, userId, {
      score,
      tier: hasScore ? affinityTier(score) : current.tier,
      mood: mood ?? current.mood,
    });
  }

  return buildMindView(characterId, userId);
}
