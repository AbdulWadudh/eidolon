import {
  AFFINITY_HUD,
  affinityToastAnnouncement,
  affinityToastLabel,
  EASING_BEZIER,
} from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, {
  cubicBezier,
  FadeOut,
  useReducedMotion,
  useSharedValue,
} from "react-native-reanimated";
import { useAffinityStore } from "@/store/affinity-store";
import { useResolvedTheme } from "@/store/theme-store";

export interface AffinityToastProps {
  characterId: string;
}

export function AffinityToast({ characterId }: AffinityToastProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const toast = useAffinityStore((state) => state.toast);
  const dismissToast = useAffinityStore((state) => state.dismissToast);
  const lift = useSharedValue(0);

  const toastId = toast?.id ?? null;

  React.useEffect(() => {
    if (!toastId) return;

    lift.set(reduced ? 0 : -6);
    const settle = requestAnimationFrame(() => lift.set(0));
    const timer = setTimeout(() => dismissToast(toastId), AFFINITY_HUD.toastHoldMs);

    return () => {
      cancelAnimationFrame(settle);
      clearTimeout(timer);
    };
  }, [toastId, dismissToast, lift, reduced]);

  if (!toast) return null;

  const isGain = toast.delta > 0;

  return (
    <View pointerEvents="none" className="absolute top-full left-0 z-10 pt-1.5">
      <Animated.View
        key={toast.id}
        exiting={reduced ? undefined : FadeOut.duration(AFFINITY_HUD.toastExitMs)}
        accessibilityLiveRegion="polite"
        accessibilityLabel={affinityToastAnnouncement(toast.delta, toast.score, toast.tier)}
        className="flex-row items-center rounded-full border bg-card px-3 py-1"
        style={{
          borderColor: isGain ? theme.primary : theme.danger,
          transform: [{ translateY: lift }],
          opacity: 1,
          transitionProperty: ["transform", "opacity"],
          transitionDuration: AFFINITY_HUD.toastEnterMs,
          transitionTimingFunction: cubicBezier(...EASING_BEZIER.out),
        }}
      >
        <Text
          className="font-ui-bold text-[11px]"
          style={{ color: isGain ? theme.primary : theme.danger }}
          numberOfLines={1}
        >
          {affinityToastLabel(toast.delta, toast.score)}
        </Text>
      </Animated.View>
    </View>
  );
}
