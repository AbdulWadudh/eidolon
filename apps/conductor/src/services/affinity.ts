import { AFFINITY, render } from "@eidolon/config";
import { clamp, isString } from "es-toolkit";
import { getPrompt } from "@/prompts/store";
import { affinityTier, applyDelta, clampScore } from "@/services/affinity-ladder";
import { type ChatMessage, streamChatCompletion } from "@/services/llm";
import { safeJsonParse } from "@/utils/json";

export { affinityTier, applyDelta, clampScore, startingTier } from "@/services/affinity-ladder";

export interface MindAppraisal {
  delta: number;
  mood: string;
}

export interface MindState extends MindAppraisal {
  score: number;
  tier: string;
}

const APPRAISAL_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: ["delta", "mood"],
  properties: {
    delta: {
      type: "integer",
      minimum: -AFFINITY.maxDeltaPerTurn,
      maximum: AFFINITY.maxDeltaPerTurn,
    },
    mood: { type: "string", enum: [...AFFINITY.moods] },
  },
} as const;

function isKnownMood(mood: string): boolean {
  return AFFINITY.moods.includes(mood as (typeof AFFINITY.moods)[number]);
}

export function moodValence(mood: string): -1 | 0 | 1 {
  if (AFFINITY.coldMoods.includes(mood as (typeof AFFINITY.coldMoods)[number])) return -1;
  if (AFFINITY.warmMoods.includes(mood as (typeof AFFINITY.warmMoods)[number])) return 1;
  return 0;
}

export function reconcile(delta: number, mood: string): number {
  const valence = moodValence(mood);
  if (valence === 0 || delta === 0) return delta;
  return valence < 0 ? -Math.abs(delta) : Math.abs(delta);
}

export function normalizeAppraisal(raw: unknown, fallbackMood: string): MindAppraisal {
  const source = raw as { delta?: unknown; mood?: unknown } | null;
  const rawDelta = Number(source?.delta);
  const rawMood = isString(source?.mood) ? source.mood : "";

  const mood = isKnownMood(rawMood) ? rawMood : fallbackMood;
  const delta = Number.isFinite(rawDelta)
    ? clamp(Math.round(rawDelta), -AFFINITY.maxDeltaPerTurn, AFFINITY.maxDeltaPerTurn)
    : 0;

  return { delta: reconcile(delta, mood), mood };
}

function appraisalPrompt(characterName: string, score: number, tier: string): string {
  return render(getPrompt("affinity.system"), {
    name: characterName,
    score,
    max: AFFINITY.max,
    tier,
    maxDelta: AFFINITY.maxDeltaPerTurn,
    moods: AFFINITY.moods.join(", "),
  });
}

export async function appraiseTurn(
  scene: string,
  characterName: string,
  score: number,
  signal?: AbortSignal,
): Promise<MindAppraisal> {
  const tier = affinityTier(score);
  const fallback: MindAppraisal = { delta: 0, mood: AFFINITY.defaultMood };

  const messages: ChatMessage[] = [
    { role: "system", content: appraisalPrompt(characterName, score, tier) },
    { role: "user", content: scene },
  ];

  let raw = "";
  try {
    for await (const token of streamChatCompletion(messages, signal, {
      temperature: AFFINITY.temperature,
      maxTokens: AFFINITY.maxTokens,
      allowMockFallback: false,
      responseSchema: { name: "mind_appraisal", schema: APPRAISAL_SCHEMA },
    })) {
      if (signal?.aborted) break;
      raw += token;
    }
  } catch {
    return fallback;
  }

  if (signal?.aborted || raw.trim().length === 0) return fallback;

  return normalizeAppraisal(safeJsonParse<unknown>(raw, null), AFFINITY.defaultMood);
}

export function nextMindState(current: number, appraisal: MindAppraisal): MindState {
  const score = applyDelta(current, appraisal.delta);
  return {
    score,
    tier: affinityTier(score),
    delta: score - clampScore(current),
    mood: appraisal.mood,
  };
}
