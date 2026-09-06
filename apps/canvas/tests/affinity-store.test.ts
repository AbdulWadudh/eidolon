import { beforeEach, describe, expect, it } from "bun:test";
import {
  AFFINITY_HUD,
  affinityLabel,
  affinityToastAnnouncement,
  affinityToastLabel,
} from "@eidolon/config";
import { clampToScale, useAffinityStore } from "@/store/affinity-store";

function reset(): void {
  useAffinityStore.getState().reset();
  useAffinityStore.getState().setInsightMode(false);
}

beforeEach(reset);

describe("clampToScale", () => {
  it("keeps a score inside the visible scale", () => {
    expect(clampToScale(-40)).toBe(0);
    expect(clampToScale(74)).toBe(74);
    expect(clampToScale(180)).toBe(AFFINITY_HUD.scaleMax);
  });

  it("rounds and survives nonsense", () => {
    expect(clampToScale(74.6)).toBe(75);
    expect(clampToScale(Number.NaN)).toBe(0);
  });
});

describe("insight mode", () => {
  it("defaults to off, so the relationship reads as prose", () => {
    expect(useAffinityStore.getState().isInsightModeEnabled).toBe(false);
  });

  it("survives a round trip through storage", () => {
    useAffinityStore.getState().setInsightMode(true);
    expect(useAffinityStore.getState().isInsightModeEnabled).toBe(true);
  });

  it("clears a visible toast when the reader turns the HUD off", () => {
    useAffinityStore.getState().setInsightMode(true);
    useAffinityStore.getState().applyMindUpdate(2, 76, "Close", "Warm");
    expect(useAffinityStore.getState().toast).not.toBeNull();

    useAffinityStore.getState().setInsightMode(false);
    expect(useAffinityStore.getState().toast).toBeNull();
  });
});

describe("applyMindUpdate", () => {
  it("records the new state whether or not the HUD is showing", () => {
    useAffinityStore.getState().applyMindUpdate(2, 76, "Close", "Warm");
    const state = useAffinityStore.getState();
    expect(state.affinityScore).toBe(76);
    expect(state.affinityTier).toBe("Close");
    expect(state.currentMood).toBe("Warm");
  });

  it("stays silent in organic mode", () => {
    useAffinityStore.getState().applyMindUpdate(2, 76, "Close", "Warm");
    expect(useAffinityStore.getState().toast).toBeNull();
  });

  it("raises a toast in insight mode when the score actually moved", () => {
    useAffinityStore.getState().setInsightMode(true);
    useAffinityStore.getState().applyMindUpdate(2, 76, "Close", "Warm");

    const toast = useAffinityStore.getState().toast;
    expect(toast?.delta).toBe(2);
    expect(toast?.score).toBe(76);
  });

  it("says nothing when the score did not move", () => {
    useAffinityStore.getState().setInsightMode(true);
    useAffinityStore.getState().applyMindUpdate(0, 74, "Close", "Warm");
    expect(useAffinityStore.getState().toast).toBeNull();
  });

  it("replaces a pending toast rather than queueing behind it", () => {
    useAffinityStore.getState().setInsightMode(true);
    useAffinityStore.getState().applyMindUpdate(2, 76, "Close", "Warm");
    const first = useAffinityStore.getState().toast;

    useAffinityStore.getState().applyMindUpdate(-1, 75, "Close", "Hurt");
    const second = useAffinityStore.getState().toast;

    expect(second?.delta).toBe(-1);
    expect(second?.id).not.toBe(first?.id);
  });

  it("clamps a score the server sent outside the scale", () => {
    useAffinityStore.getState().applyMindUpdate(3, 140, "Devoted", "Warm");
    expect(useAffinityStore.getState().affinityScore).toBe(AFFINITY_HUD.scaleMax);
  });
});

describe("author override", () => {
  it("moves the score without touching the lock", () => {
    useAffinityStore.getState().setManualAffinity(42);
    expect(useAffinityStore.getState().affinityScore).toBe(42);
    expect(useAffinityStore.getState().isAffinityLocked).toBe(false);
  });

  it("holds the lock flag the drawer renders from", () => {
    useAffinityStore.getState().setAffinityLock(true);
    expect(useAffinityStore.getState().isAffinityLocked).toBe(true);
  });

  it("hydrates from the conductor", () => {
    useAffinityStore.getState().hydrate({
      affinityScore: 74,
      affinityTier: "Trusted Confidant",
      currentMood: "Playful",
      isAffinityLocked: true,
    });

    const state = useAffinityStore.getState();
    expect(state.affinityScore).toBe(74);
    expect(state.affinityTier).toBe("Trusted Confidant");
    expect(state.isAffinityLocked).toBe(true);
  });
});

describe("toast dismissal", () => {
  it("only clears the toast it was asked to clear", () => {
    useAffinityStore.getState().setInsightMode(true);
    useAffinityStore.getState().applyMindUpdate(2, 76, "Close", "Warm");
    const id = useAffinityStore.getState().toast?.id ?? "";

    useAffinityStore.getState().dismissToast("some-older-id");
    expect(useAffinityStore.getState().toast).not.toBeNull();

    useAffinityStore.getState().dismissToast(id);
    expect(useAffinityStore.getState().toast).toBeNull();
  });
});

describe("hud copy", () => {
  it("writes the insight subtitle the spec asks for", () => {
    expect(affinityLabel("Trusted Confidant", 74)).toBe("Trusted Confidant • 74/100");
  });

  it("writes the toast pill with an explicit sign", () => {
    expect(affinityToastLabel(2, 76)).toBe("✦ Trust +2 (76/100)");
    expect(affinityToastLabel(-1, 73)).toBe("✦ Trust -1 (73/100)");
  });

  it("announces a contextual phrase rather than a bare number", () => {
    expect(affinityToastAnnouncement(2, 76, "Close")).toBe(
      "Trust rose by 2. Now 76 of 100, Close.",
    );
    expect(affinityToastAnnouncement(-1, 73, "Wary")).toBe("Trust fell by 1. Now 73 of 100, Wary.");
  });
});
