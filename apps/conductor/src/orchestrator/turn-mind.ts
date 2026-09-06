import { getCharacterMind, isAffinityLocked, saveCharacterMind } from "@/db";
import { parseMindBlock } from "@/orchestrator/mind-block";
import { appraiseTurn, type MindAppraisal, nextMindState } from "@/services/affinity";
import { sendServerMessage, type WebSocketSender } from "@/ws/protocol";

export interface SettleMindOptions {
  characterId: string;
  characterName: string;
  mindBlock: string;
  scene: string;
  signal?: AbortSignal;
}

export type MindSource = "inline" | "appraisal" | "locked";

export interface SettledMind {
  source: MindSource;
  score: number;
  tier: string;
  mood: string;
  delta: number;
  newMemory: string | null;
}

export async function settleMind(
  ws: WebSocketSender,
  options: SettleMindOptions,
): Promise<SettledMind> {
  const previous = getCharacterMind(options.characterId);
  const inline = parseMindBlock(options.mindBlock);
  const locked = isAffinityLocked(options.characterId);

  let source: MindSource = inline ? "inline" : "appraisal";
  let appraisal: MindAppraisal = inline
    ? { delta: inline.affinityDelta, mood: inline.mood }
    : await appraiseTurn(options.scene, options.characterName, previous.score, options.signal);

  if (locked) {
    source = "locked";
    appraisal = { delta: 0, mood: appraisal.mood };
  }

  const mind = nextMindState(previous.score, appraisal);
  console.log(
    `[mind] ${options.characterName}: ${source} delta=${appraisal.delta} mood=${appraisal.mood}`,
  );
  saveCharacterMind(options.characterId, {
    score: mind.score,
    tier: mind.tier,
    mood: mind.mood,
  });

  const newMemory = inline?.newMemory ?? null;

  sendServerMessage(ws, {
    type: "mind_update",
    payload: {
      affinity_delta: mind.delta,
      current_affinity: mind.score,
      affinity_tier: mind.tier,
      current_mood: mind.mood,
      ...(newMemory ? { new_memory_logged: newMemory } : {}),
    },
  });

  return {
    source,
    score: mind.score,
    tier: mind.tier,
    mood: mind.mood,
    delta: mind.delta,
    newMemory,
  };
}
