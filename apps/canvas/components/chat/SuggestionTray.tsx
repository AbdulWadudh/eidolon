import { CHAT_MS, EASING_BEZIER } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, {
  Easing,
  FadeInDown,
  FadeOutDown,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Cancel01Icon, RefreshIcon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";
import { SuggestionRow } from "./SuggestionRow";
import { SuggestionShimmer } from "./SuggestionShimmer";

const EASE_OUT = Easing.bezier(...EASING_BEZIER.out);
const FULL_TURN = 360;

export interface SuggestionTrayProps {
  suggestions: string[];
  isLoading: boolean;
  characterId: string;
  onSend: (text: string) => void;
  onEdit: (text: string) => void;
  onReroll: () => void;
  onHide: () => void;
}

export function SuggestionTray({
  suggestions,
  isLoading,
  characterId,
  onSend,
  onEdit,
  onReroll,
  onHide,
}: SuggestionTrayProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);

  const spinStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.get()}deg` }],
  }));

  const handleReroll = React.useCallback(() => {
    if (!reduced) {
      spin.set(0);
      spin.set(withTiming(FULL_TURN, { duration: CHAT_MS.rerollSpin, easing: EASE_OUT }));
    }
    onReroll();
  }, [onReroll, reduced, spin]);

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(CHAT_MS.trayCollapse)}
      exiting={reduced ? undefined : FadeOutDown.duration(CHAT_MS.trayCollapse)}
      className="mx-4 mb-2 overflow-hidden rounded-card border border-border bg-card"
    >
      <View className="flex-row items-center justify-between border-border border-b px-3.5 py-2.5">
        <Text className="font-ui-bold text-xs text-text-muted uppercase tracking-[1.5px]">
          Choose one to reply
        </Text>

        <View className="flex-row items-center gap-1">
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Reroll reply options"
            accessibilityState={{ busy: isLoading }}
            hitSlop={10}
            onPress={handleReroll}
            className="flex-row items-center gap-1.5 rounded-button px-1.5 py-1"
          >
            <Animated.View style={spinStyle}>
              <AppIcon icon={RefreshIcon} size={14} color={theme.primary} strokeWidth={2} />
            </Animated.View>
            <Text className="font-ui-medium text-primary text-xs">Reroll</Text>
          </PressableScale>

          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Collapse reply options"
            accessibilityHint="They stay available from the button above the message box."
            hitSlop={10}
            onPress={onHide}
            className="h-7 w-7 items-center justify-center rounded-button"
          >
            <AppIcon icon={Cancel01Icon} size={14} color={theme.textMuted} strokeWidth={2} />
          </PressableScale>
        </View>
      </View>

      {isLoading ? (
        <SuggestionShimmer characterId={characterId} />
      ) : (
        suggestions.map((suggestion, index) => (
          <SuggestionRow
            key={suggestion}
            text={suggestion}
            index={index}
            isFirst={index === 0}
            characterId={characterId}
            onSend={onSend}
            onEdit={onEdit}
          />
        ))
      )}
    </Animated.View>
  );
}
