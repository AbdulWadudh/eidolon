import { describe, expect, it } from "bun:test";
import { AFFINITY } from "@eidolon/config";
import {
  affinityTier,
  applyDelta,
  clampScore,
  moodValence,
  nextMindState,
  normalizeAppraisal,
  reconcile,
} from "@/services/affinity";

describe("affinity ladder", () => {
  it("starts at the bottom tier and climbs with the score", () => {
    expect(affinityTier(-100)).toBe("Hostile");
    expect(affinityTier(0)).toBe("Distant");
    expect(affinityTier(40)).toBe("Friendly");
    expect(affinityTier(85)).toBe("Trusted Confidant");
    expect(affinityTier(100)).toBe("Devoted");
  });

  it("never skips or reverses a tier as the score rises", () => {
    let seen = 0;
    let previous = affinityTier(AFFINITY.min);
    for (let score = AFFINITY.min; score <= AFFINITY.max; score += 1) {
      const tier = affinityTier(score);
      if (tier !== previous) {
        seen += 1;
        previous = tier;
      }
    }
    expect(seen).toBe(AFFINITY.tiers.length - 1);
  });

  it("promotes exactly on a threshold, not one point late", () => {
    for (const step of AFFINITY.tiers) {
      expect(affinityTier(step.from)).toBe(step.name);
    }
  });

  it("clamps a score to the configured range", () => {
    expect(clampScore(999)).toBe(AFFINITY.max);
    expect(clampScore(-999)).toBe(AFFINITY.min);
    expect(clampScore(Number.NaN)).toBe(AFFINITY.start);
  });
});

describe("applying a turn", () => {
  it("adds the delta within the range", () => {
    expect(applyDelta(50, 3)).toBe(53);
    expect(applyDelta(50, -3)).toBe(47);
  });

  it("caps a single turn so one exchange cannot swing the relationship", () => {
    expect(applyDelta(50, 99)).toBe(50 + AFFINITY.maxDeltaPerTurn);
    expect(applyDelta(50, -99)).toBe(50 - AFFINITY.maxDeltaPerTurn);
  });

  it("cannot push past the ceiling or floor", () => {
    expect(applyDelta(AFFINITY.max, 5)).toBe(AFFINITY.max);
    expect(applyDelta(AFFINITY.min, -5)).toBe(AFFINITY.min);
  });

  it("reports the delta that was actually applied, not the one requested", () => {
    const state = nextMindState(AFFINITY.max, { delta: 5, mood: "Warm" });
    expect(state.score).toBe(AFFINITY.max);
    expect(state.delta).toBe(0);
  });

  it("derives the tier from the new score", () => {
    const state = nextMindState(78, { delta: 4, mood: "Warm" });
    expect(state.score).toBe(82);
    expect(state.tier).toBe(affinityTier(82));
  });
});

describe("appraisal normalisation", () => {
  it("keeps a valid appraisal", () => {
    expect(normalizeAppraisal({ delta: 2, mood: "Playful" }, "Curious")).toEqual({
      delta: 2,
      mood: "Playful",
    });
  });

  it("rejects a mood outside the vocabulary", () => {
    expect(normalizeAppraisal({ delta: 1, mood: "Sassy" }, "Curious").mood).toBe("Curious");
  });

  it("treats a missing or unparsable appraisal as no change", () => {
    expect(normalizeAppraisal(null, "Curious")).toEqual({ delta: 0, mood: "Curious" });
    expect(normalizeAppraisal({ delta: "lots", mood: 7 }, "Curious")).toEqual({
      delta: 0,
      mood: "Curious",
    });
  });

  it("clamps a delta the model exaggerated", () => {
    expect(normalizeAppraisal({ delta: 50, mood: "Warm" }, "Curious").delta).toBe(
      AFFINITY.maxDeltaPerTurn,
    );
  });

  it("rounds a fractional delta", () => {
    expect(normalizeAppraisal({ delta: 1.6, mood: "Warm" }, "Curious").delta).toBe(2);
  });
});

describe("mood and delta must agree", () => {
  it("knows which moods are warm, cold and neutral", () => {
    expect(moodValence("Warm")).toBe(1);
    expect(moodValence("Hurt")).toBe(-1);
    expect(moodValence("Curious")).toBe(0);
    expect(moodValence("Nonsense")).toBe(0);
  });

  it("forces a cold mood to lower affinity even when the model says otherwise", () => {
    expect(reconcile(5, "Hurt")).toBe(-5);
    expect(normalizeAppraisal({ delta: 5, mood: "Hurt" }, "Curious")).toEqual({
      delta: -5,
      mood: "Hurt",
    });
  });

  it("forces a warm mood to raise affinity", () => {
    expect(reconcile(-3, "Affectionate")).toBe(3);
  });

  it("leaves a neutral mood alone in either direction", () => {
    expect(reconcile(-2, "Curious")).toBe(-2);
    expect(reconcile(2, "Thoughtful")).toBe(2);
  });

  it("keeps zero at zero", () => {
    expect(reconcile(0, "Hurt")).toBe(0);
  });
});

describe("the starting point", () => {
  it("names the tier the starting score actually falls in", () => {
    expect(affinityTier(AFFINITY.start)).toBe(affinityTier(0));
    expect(affinityTier(AFFINITY.start)).not.toBe(affinityTier(AFFINITY.min));
  });
});
