import { AFFINITY_HUD } from "@eidolon/config";
import { create } from "zustand";
import { tap } from "@/services/haptics";
import { appStorage } from "@/store/storage";

const INSIGHT_KEY = "eidolon.affinity.insight_mode";
const WEB_SEARCH_KEY = "eidolon.affinity.allow_web_search";

export interface AffinityToast {
  id: string;
  delta: number;
  score: number;
  tier: string;
}

export interface AffinityState {
  affinityScore: number;
  affinityTier: string;
  currentMood: string;
  isAffinityLocked: boolean;
  isInsightModeEnabled: boolean;
  allowWebSearch: boolean;
  toast: AffinityToast | null;

  setInsightMode: (enabled: boolean) => void;
  setAllowWebSearch: (enabled: boolean) => void;
  applyMindUpdate: (delta: number, newScore: number, tier: string, mood: string) => void;
  setManualAffinity: (score: number) => void;
  setAffinityLock: (locked: boolean) => void;
  hydrate: (snapshot: AffinitySnapshot) => void;
  dismissToast: (id: string) => void;
  reset: () => void;
}

export interface AffinitySnapshot {
  affinityScore: number;
  affinityTier: string;
  currentMood: string;
  isAffinityLocked: boolean;
}

const INITIAL = {
  affinityScore: 0,
  affinityTier: "",
  currentMood: "",
  isAffinityLocked: false,
  toast: null as AffinityToast | null,
};

// A wall-clock id collides when two updates land in the same millisecond, and a
// colliding key means React never remounts the pill: no exit, no re-entrance,
// and no fresh announcement for a screen reader.
let toastSequence = 0;

export function nextToastId(): string {
  toastSequence += 1;
  return `affinity-${toastSequence}`;
}

export function clampToScale(score: number): number {
  if (!Number.isFinite(score)) return 0;
  return Math.max(0, Math.min(AFFINITY_HUD.scaleMax, Math.round(score)));
}

export const useAffinityStore = create<AffinityState>((set, get) => ({
  ...INITIAL,
  isInsightModeEnabled: appStorage.getBoolean(INSIGHT_KEY) ?? false,
  allowWebSearch: appStorage.getBoolean(WEB_SEARCH_KEY) ?? true,

  setInsightMode(enabled) {
    appStorage.set(INSIGHT_KEY, enabled);
    set({ isInsightModeEnabled: enabled, ...(enabled ? {} : { toast: null }) });
  },

  setAllowWebSearch(enabled) {
    appStorage.set(WEB_SEARCH_KEY, enabled);
    set({ allowWebSearch: enabled });
  },

  applyMindUpdate(delta, newScore, tier, mood) {
    const score = clampToScale(newScore);
    const shouldAnnounce = get().isInsightModeEnabled && delta !== 0;

    set({
      affinityScore: score,
      affinityTier: tier,
      currentMood: mood,
      // A second update replaces the first rather than queueing behind it, so
      // the pill always shows where the relationship actually stands now.
      toast: shouldAnnounce ? { id: nextToastId(), delta, score, tier } : null,
    });

    if (shouldAnnounce) tap("light");
  },

  setManualAffinity(score) {
    set({ affinityScore: clampToScale(score) });
  },

  setAffinityLock(locked) {
    set({ isAffinityLocked: locked });
  },

  hydrate(snapshot) {
    set({
      affinityScore: clampToScale(snapshot.affinityScore),
      affinityTier: snapshot.affinityTier,
      currentMood: snapshot.currentMood,
      isAffinityLocked: snapshot.isAffinityLocked,
    });
  },

  dismissToast(id) {
    if (get().toast?.id === id) set({ toast: null });
  },

  reset() {
    set({ ...INITIAL });
  },
}));
