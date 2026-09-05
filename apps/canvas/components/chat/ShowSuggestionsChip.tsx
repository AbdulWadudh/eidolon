import { CHAT_MS } from "@eidolon/config";
import { Text } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { SparklesIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface ShowSuggestionsChipProps {
  count: number;
  characterId?: string;
  onPress: () => void;
  onTurnOff?: () => void;
}

export function ShowSuggestionsChip({
  count,
  characterId,
  onPress,
  onTurnOff,
}: ShowSuggestionsChipProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const label = count > 0 ? `Show ${count} replies` : "Show replies";

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(CHAT_MS.trayCollapse)}
      exiting={reduced ? undefined : FadeOutDown.duration(CHAT_MS.trayCollapse)}
      className="mx-4 mb-2 items-end"
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        accessibilityHint="Long press to stop offering reply options."
        hitSlop={10}
        onPress={onPress}
        onLongPress={onTurnOff}
        className="flex-row items-center gap-1.5 rounded-full border border-primary/40 bg-card px-3 py-1.5"
      >
        <AppIcon icon={SparklesIcon} size={13} color={theme.primary} strokeWidth={2} />
        <Text className="font-ui-medium text-xs text-primary">{label}</Text>
      </PressableScale>
    </Animated.View>
  );
}
