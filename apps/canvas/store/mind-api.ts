import {
  characterAffinityUrl,
  characterChronicleUrl,
  characterLoreUrl,
  characterMindUrl,
  characterSummarizeUrl,
  TIMEOUTS_MS,
} from "@eidolon/config";
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
    pronouns: string;
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
      pronouns: view.character.pronouns,
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
  mood?: string;
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
      pronouns: view.character.pronouns,
      isAffinityLocked: view.character.isLocked,
    });
    return view;
  } catch {
    return null;
  }
}

async function mindMutation(url: string, method: string, body?: unknown): Promise<MindView | null> {
  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
      signal: withTimeout(),
    });
    if (!res.ok) return null;

    const payload = (await res.json()) as MindView & { mind?: MindView };
    return payload.mind ?? payload;
  } catch {
    return null;
  }
}

export interface LoreDraft {
  keys: string[];
  content: string;
  requiredAffinity?: number;
  isActive?: boolean;
}

export function createLore(host: string, characterId: string, draft: LoreDraft) {
  return host ? mindMutation(characterLoreUrl(host, characterId), "POST", draft) : null;
}

export function updateLore(host: string, characterId: string, entryId: string, draft: LoreDraft) {
  return host ? mindMutation(characterLoreUrl(host, characterId, entryId), "PATCH", draft) : null;
}

export function removeLore(host: string, characterId: string, entryId: string) {
  return host ? mindMutation(characterLoreUrl(host, characterId, entryId), "DELETE") : null;
}

export function createChapter(host: string, characterId: string, summaryText: string) {
  return host
    ? mindMutation(characterChronicleUrl(host, characterId), "POST", { summaryText })
    : null;
}

export function updateChapter(
  host: string,
  characterId: string,
  chapterId: string,
  summaryText: string,
) {
  return host
    ? mindMutation(characterChronicleUrl(host, characterId, chapterId), "PATCH", { summaryText })
    : null;
}

export function removeChapter(host: string, characterId: string, chapterId: string) {
  return host ? mindMutation(characterChronicleUrl(host, characterId, chapterId), "DELETE") : null;
}

export function summarizeNow(host: string, characterId: string) {
  return host ? mindMutation(characterSummarizeUrl(host, characterId), "POST") : null;
}
