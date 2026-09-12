import { AFFINITY } from "@eidolon/config";
import { clamp } from "es-toolkit";

export function clampScore(score: number): number {
  if (!Number.isFinite(score)) return AFFINITY.start;
  return clamp(Math.round(score), AFFINITY.min, AFFINITY.max);
}

export function affinityTier(score: number): string {
  const clamped = clampScore(score);
  let tier: string = AFFINITY.tiers[0].name;
  for (const step of AFFINITY.tiers) {
    if (clamped >= step.from) tier = step.name;
  }
  return tier;
}

export function applyDelta(currentScore: number, delta: number): number {
  const safeDelta = Number.isFinite(delta)
    ? clamp(Math.round(delta), -AFFINITY.maxDeltaPerTurn, AFFINITY.maxDeltaPerTurn)
    : 0;
  return clampScore(clampScore(currentScore) + safeDelta);
}

export function startingTier(): string {
  return affinityTier(AFFINITY.start);
}
