import { AFFINITY, MOOD_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SwitchRow } from "@/components/ui/switch";
import { useVoice } from "@/hooks/use-voice";
import { Cancel01Icon } from "@/lib/icons";
import type { MoodOverride } from "@/store/chat-types";
import { useResolvedTheme } from "@/store/theme-store";

export interface MoodSheetProps {
  isOpen: boolean;
  characterId: string;
  currentMood: string;
  override: MoodOverride | null;
  onClose: () => void;
  onApply: (mood: string, hold: boolean) => void;
  onClear: () => void;
}

export function MoodSheet({
  isOpen,
  characterId,
  currentMood,
  override,
  onClose,
  onApply,
  onClear,
}: MoodSheetProps) {
  const theme = useResolvedTheme(characterId);
  const say = useVoice();
  const reduced = useReducedMotion();
  const [hold, setHold] = React.useState(false);

  React.useEffect(() => {
    if (isOpen) setHold(override?.hold ?? false);
  }, [isOpen, override]);

  const selected = override?.mood ?? currentMood;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
      >
        <Pressable accessibilityLabel={MOOD_COPY.close} className="flex-1" onPress={onClose} />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="overflow-hidden rounded-t-card border-border border-t px-4 pt-4 pb-8"
        >
          <GlassSurface tint="card" overlay pointerEvents="none" style={StyleSheet.absoluteFill} />

          <View className="mb-1 flex-row items-center justify-between">
            <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
              {say(MOOD_COPY.title)}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={MOOD_COPY.close}
              hitSlop={12}
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full border border-border"
            >
              <AppIcon icon={Cancel01Icon} size={16} color={theme.textMuted} />
            </PressableScale>
          </View>

          <Text className="mb-3 font-ui text-[11px] text-text-muted leading-4">
            {say(MOOD_COPY.hint)}
          </Text>

          <View className="mb-3 flex-row flex-wrap gap-2">
            {AFFINITY.moods.map((mood) => {
              const isSelected = mood === selected;
              return (
                <PressableScale
                  key={mood}
                  accessibilityRole="button"
                  accessibilityState={{ selected: isSelected }}
                  accessibilityLabel={mood}
                  onPress={() => onApply(mood, hold)}
                  className="border px-3 py-2"
                  style={{
                    borderRadius: theme.radius,
                    borderColor: isSelected ? theme.primary : theme.cardBorder,
                    backgroundColor: isSelected ? `${theme.primary}22` : theme.inputSurface,
                  }}
                >
                  <Text
                    className="font-ui text-sm"
                    style={{ color: isSelected ? theme.primary : theme.textPrimary }}
                  >
                    {mood}
                  </Text>
                </PressableScale>
              );
            })}
          </View>

          <View className="border-border border-t pt-3">
            <SwitchRow
              characterId={characterId}
              label={MOOD_COPY.holdLabel}
              hint={say(MOOD_COPY.holdHint)}
              value={hold}
              onValueChange={setHold}
              accessibilityLabel={MOOD_COPY.holdLabel}
            />
          </View>

          {override ? (
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={MOOD_COPY.clear}
              onPress={onClear}
              className="mt-3 h-11 items-center justify-center rounded-button border border-border"
            >
              <Text className="font-ui-medium text-sm" style={{ color: theme.textMuted }}>
                {override.hold
                  ? MOOD_COPY.clearHeld(override.mood)
                  : MOOD_COPY.clearOnce(override.mood)}
              </Text>
            </PressableScale>
          ) : null}
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
