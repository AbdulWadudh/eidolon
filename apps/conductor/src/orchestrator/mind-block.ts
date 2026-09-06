import { AFFINITY, MIND_UPDATE } from "@eidolon/config";
import { clamp, isString } from "es-toolkit";
import { safeJsonParse } from "@/utils/json";

export interface MindBlock {
  affinityDelta: number;
  mood: string;
  newMemory: string | null;
}

const BLOCK = /\[mind_update:\s*([\s\S]*?)\]\s*$/i;

export function stripMindBlock(reply: string): string {
  return reply.replace(BLOCK, "").trimEnd();
}

export function hasMindBlock(reply: string): boolean {
  return BLOCK.test(reply);
}

function normalizeMood(raw: unknown, fallback: string): string {
  if (!isString(raw)) return fallback;
  const words = raw.trim().split(/\s+/).slice(0, MIND_UPDATE.moodMaxWords);
  const mood = words
    .join(" ")
    .replace(/[^\p{L}\s-]/gu, "")
    .trim();
  return mood.length > 0 ? mood : fallback;
}

function normalizeMemory(raw: unknown): string | null {
  if (!isString(raw)) return null;
  const memory = raw.trim();
  if (memory.length === 0 || memory.toLowerCase() === "null") return null;
  return memory.slice(0, MIND_UPDATE.memoryMaxChars);
}

export function parseMindBlock(reply: string): MindBlock | null {
  const match = BLOCK.exec(reply);
  if (!match?.[1]) return null;

  const parsed = safeJsonParse<{
    affinity_delta?: unknown;
    mood?: unknown;
    new_memory?: unknown;
  } | null>(match[1], null);

  if (!parsed) return null;

  const rawDelta = Number(parsed.affinity_delta);

  return {
    affinityDelta: Number.isFinite(rawDelta)
      ? clamp(Math.round(rawDelta), MIND_UPDATE.minDelta, MIND_UPDATE.maxDelta)
      : 0,
    mood: normalizeMood(parsed.mood, AFFINITY.defaultMood),
    newMemory: normalizeMemory(parsed.new_memory),
  };
}
