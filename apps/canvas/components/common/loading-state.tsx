import { CHAT, UI_MS } from "@eidolon/config";
import { ActivityIndicator, Text } from "react-native";
import Animated, { FadeIn, useReducedMotion } from "react-native-reanimated";
import { PressableScale } from "@/components/common/pressable-scale";
import { useResolvedTheme } from "@/store/theme-store";

export interface LoadingStateProps {
  label: string;
  characterId?: string;
  fill?: boolean;
}

export function LoadingState({ label, characterId, fill = true }: LoadingStateProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <Animated.View
      accessibilityRole="progressbar"
      accessibilityLabel={label}
      entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
      className={
        fill ? "flex-1 items-center justify-center gap-3 py-16" : "items-center gap-3 py-8"
      }
    >
      <ActivityIndicator size="small" color={theme.primary} />
      <Text className="font-ui text-[12px] text-text-muted">{label}</Text>
    </Animated.View>
  );
}

export interface LoadFailedProps {
  message: string;
  retryLabel: string;
  characterId?: string;
  onRetry: () => void;
}

export function LoadFailed({ message, retryLabel, characterId, onRetry }: LoadFailedProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <Animated.View
      entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
      className="flex-1 items-center justify-center gap-3 px-8 py-16"
    >
      <Text
        accessibilityLiveRegion="polite"
        className="text-center font-main text-[14px] text-text-muted leading-5"
      >
        {message}
      </Text>

      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={retryLabel}
        hitSlop={8}
        onPress={onRetry}
        className="items-center justify-center rounded-button border px-4"
        style={{ borderColor: theme.primary, minHeight: CHAT.minTouchTargetPx }}
      >
        <Text className="font-ui-medium text-[12px]" style={{ color: theme.primary }}>
          {retryLabel}
        </Text>
      </PressableScale>
    </Animated.View>
  );
}
