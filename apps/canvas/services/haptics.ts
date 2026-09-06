export type HapticWeight = "light" | "medium" | "success";

interface HapticsModule {
  impactAsync?: (style: unknown) => Promise<void>;
  notificationAsync?: (type: unknown) => Promise<void>;
  ImpactFeedbackStyle?: { Light?: unknown; Medium?: unknown };
  NotificationFeedbackType?: { Success?: unknown };
}

let cached: HapticsModule | null | undefined;

/**
 * Loaded on first use rather than at import time. expo-haptics pulls in the
 * Expo runtime, which needs __DEV__ and a native host; requiring it eagerly
 * broke every store test that merely imported the module graph.
 */
function loadHaptics(): HapticsModule | null {
  if (cached !== undefined) return cached;

  try {
    cached = require("expo-haptics") as HapticsModule;
  } catch {
    cached = null;
  }

  return cached;
}

export function tap(weight: HapticWeight = "light"): void {
  const haptics = loadHaptics();
  if (!haptics) return;

  try {
    if (weight === "success") {
      void haptics
        .notificationAsync?.(haptics.NotificationFeedbackType?.Success)
        ?.catch(() => undefined);
      return;
    }

    const style =
      weight === "medium"
        ? haptics.ImpactFeedbackStyle?.Medium
        : haptics.ImpactFeedbackStyle?.Light;

    void haptics.impactAsync?.(style)?.catch(() => undefined);
  } catch {
    // Haptics are never the only feedback, so a silent failure is survivable.
  }
}
