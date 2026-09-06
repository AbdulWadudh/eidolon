import { characterAffinityUrl, characterMindUrl, TIMEOUTS_MS } from "@eidolon/config";
import { useAffinityStore } from "@/store/affinity-store";

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

function withTimeout(): AbortSignal {
  return AbortSignal.timeout(TIMEOUTS_MS.clientRequest);
}

export async function fetchMind(host: string, characterId: string): Promise<MindView | null> {
  if (!host) return null;

  try {
    const res = await fetch(characterMindUrl(host, characterId), { signal: withTimeout() });
    if (!res.ok) return null;

    const view = (await res.json()) as MindView;
    useAffinityStore.getState().hydrate({
      affinityScore: view.character.affinity,
      affinityTier: view.character.tier,
      currentMood: view.character.mood,
      isAffinityLocked: view.character.isLocked,
    });
    return view;
  } catch {
    return null;
  }
}

export interface AffinityPatch {
  score?: number;
  locked?: boolean;
}

export async function patchAffinity(
  host: string,
  characterId: string,
  patch: AffinityPatch,
): Promise<MindView | null> {
  if (!host) return null;

  try {
    const res = await fetch(characterAffinityUrl(host, characterId), {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
      signal: withTimeout(),
    });
    if (!res.ok) return null;

    const view = (await res.json()) as MindView;
    useAffinityStore.getState().hydrate({
      affinityScore: view.character.affinity,
      affinityTier: view.character.tier,
      currentMood: view.character.mood,
      isAffinityLocked: view.character.isLocked,
    });
    return view;
  } catch {
    return null;
  }
}
