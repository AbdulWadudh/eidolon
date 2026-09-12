export type HapticWeight = "light" | "medium" | "success";

interface HapticsModule {
  impactAsync?: (style: unknown) => Promise<void>;
  notificationAsync?: (type: unknown) => Promise<void>;
  selectionAsync?: () => Promise<void>;
  ImpactFeedbackStyle?: { Light?: unknown; Medium?: unknown };
  NotificationFeedbackType?: { Success?: unknown };
}

let cached: HapticsModule | null | undefined;

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
  } catch {}
}

export function select(): void {
  const haptics = loadHaptics();
  if (!haptics) return;

  try {
    void haptics.selectionAsync?.()?.catch(() => undefined);
  } catch {}
}
