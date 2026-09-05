import { CHAT_MS } from "@eidolon/config";
import { Text, View } from "react-native";
import Animated, { FadeInDown, FadeOutDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { ArrowDown01Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface JumpToLatestProps {
  isStreaming: boolean;
  characterId?: string;
  onPress: () => void;
}

export function JumpToLatest({ isStreaming, characterId, onPress }: JumpToLatestProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const label = isStreaming ? "Replying below" : "Jump to latest";

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(CHAT_MS.trayCollapse)}
      exiting={reduced ? undefined : FadeOutDown.duration(CHAT_MS.trayCollapse)}
      className="absolute right-0 bottom-2 left-0 items-center"
      pointerEvents="box-none"
    >
      <PressableScale
        accessibilityRole="button"
        accessibilityLabel={label}
        hitSlop={8}
        onPress={onPress}
        className="flex-row items-center gap-2 rounded-full border border-border bg-audio-pill px-3.5 py-2"
      >
        {isStreaming ? <View className="h-1.5 w-1.5 rounded-full bg-primary" /> : null}
        <Text className="font-ui-medium text-text-primary text-xs">{label}</Text>
        <AppIcon icon={ArrowDown01Icon} size={14} color={theme.primary} strokeWidth={2} />
      </PressableScale>
    </Animated.View>
  );
}
