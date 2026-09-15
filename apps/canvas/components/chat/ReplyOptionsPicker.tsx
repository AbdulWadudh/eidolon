import { CHAT_COPY, CHAT_MS, pronounsFor } from "@eidolon/config";
import * as Haptics from "expo-haptics";
import { Text, View } from "react-native";
import Animated, { FadeInDown, useReducedMotion } from "react-native-reanimated";
import { RoleplayText } from "@/components/chat/RoleplayText";
import { SuggestionShimmer } from "@/components/chat/SuggestionShimmer";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { ArrowRight01Icon, Cancel01Icon, RefreshIcon } from "@/lib/icons";
import { cn } from "@/lib/utils";
import { useAffinityStore } from "@/store/affinity-store";
import { useResolvedTheme } from "@/store/theme-store";

export interface ReplyOptionsPickerProps {
  characterId: string;
  options: string[];
  isBusy?: boolean;
  isLoading?: boolean;
  onPick: (text: string) => void;
  onEditOption: (text: string) => void;
  onReroll: () => void;
  onCancel: () => void;
}

export function ReplyOptionsPicker({
  characterId,
  options,
  isBusy = false,
  isLoading = false,
  onPick,
  onEditOption,
  onReroll,
  onCancel,
}: ReplyOptionsPickerProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const subject = pronounsFor(useAffinityStore((state) => state.pronouns)).subject;

  return (
    <Animated.View
      entering={reduced ? undefined : FadeInDown.duration(CHAT_MS.trayCollapse)}
      className="mt-2 w-full overflow-hidden rounded-card border border-border"
    >
      <GlassSurface tint="card" characterId={characterId} className="w-full">
        <View className="flex-row items-center justify-between border-border border-b px-3.5 py-2.5">
          <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
            {CHAT_COPY.pickReplacement}
          </Text>

          <View className="flex-row items-center gap-1">
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={CHAT_COPY.rerollOptions}
              accessibilityState={{ busy: isBusy }}
              disabled={isBusy}
              hitSlop={10}
              onPress={onReroll}
              className="h-7 flex-row items-center gap-1.5 rounded-button px-2"
              style={{ opacity: isBusy ? 0.4 : 1 }}
            >
              <AppIcon icon={RefreshIcon} size={13} color={theme.primary} strokeWidth={2} />
              <Text className="font-ui-medium text-[11px]" style={{ color: theme.primary }}>
                {CHAT_COPY.rerollOptions}
              </Text>
            </PressableScale>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={CHAT_COPY.dismissOptions(subject)}
              hitSlop={10}
              onPress={onCancel}
              className="h-7 w-7 items-center justify-center rounded-button"
            >
              <AppIcon icon={Cancel01Icon} size={14} color={theme.textMuted} strokeWidth={2} />
            </PressableScale>
          </View>
        </View>

        {isLoading ? <SuggestionShimmer characterId={characterId} /> : null}

        {(isLoading ? [] : options).map((option, index) => (
          <PressableScale
            key={option}
            accessibilityRole="button"
            accessibilityLabel={`${CHAT_COPY.pickReplacement}: ${option}`}
            accessibilityHint={CHAT_COPY.holdToEditOption}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => undefined);
              onPick(option);
            }}
            onLongPress={() => {
              Haptics.selectionAsync().catch(() => undefined);
              onEditOption(option);
            }}
            className={cn(
              "flex-row items-center gap-3 px-3.5 py-3 active:bg-input",
              index === 0 ? "" : "border-border border-t",
            )}
          >
            <View className="flex-1">
              <RoleplayText text={option} />
            </View>
            <AppIcon icon={ArrowRight01Icon} size={16} color={theme.textMuted} strokeWidth={2} />
          </PressableScale>
        ))}
      </GlassSurface>
    </Animated.View>
  );
}
