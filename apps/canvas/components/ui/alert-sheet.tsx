import { MIND_COPY, UI_MS } from "@eidolon/config";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { useResolvedTheme } from "@/store/theme-store";

export interface AlertSheetProps {
  isOpen: boolean;
  characterId?: string;
  title: string;
  body?: string;
  confirmLabel?: string;
  isDestructive?: boolean;
  onConfirm?: () => void;
  onClose: () => void;
}

export function AlertSheet({
  isOpen,
  characterId,
  title,
  body,
  confirmLabel,
  isDestructive = false,
  onConfirm,
  onClose,
}: AlertSheetProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const asksFirst = onConfirm !== undefined;

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 items-center justify-center px-8"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <Pressable
          accessibilityLabel={MIND_COPY.closeLabel}
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="w-full max-w-sm overflow-hidden rounded-card border border-card-border p-5"
        >
          <GlassSurface tint="card" overlay pointerEvents="none" style={StyleSheet.absoluteFill} />

          <Text className="font-main-bold text-base text-text-primary">{title}</Text>
          {body ? (
            <Text className="mt-2 font-ui text-sm text-text-muted leading-5">{body}</Text>
          ) : null}

          <View className="mt-5 flex-row justify-end gap-2">
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={asksFirst ? MIND_COPY.cancel : MIND_COPY.closeLabel}
              onPress={onClose}
              className="h-10 items-center justify-center rounded-button border border-border px-4"
            >
              <Text className="font-ui-medium text-sm" style={{ color: theme.textMuted }}>
                {asksFirst ? MIND_COPY.cancel : MIND_COPY.closeLabel}
              </Text>
            </PressableScale>

            {asksFirst ? (
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={confirmLabel ?? MIND_COPY.save}
                onPress={() => {
                  onConfirm?.();
                  onClose();
                }}
                className="h-10 items-center justify-center rounded-button px-4"
                style={{ backgroundColor: isDestructive ? theme.danger : theme.primary }}
              >
                <Text
                  className="font-ui-bold text-sm"
                  style={{ color: isDestructive ? theme.textPrimary : theme.primaryForeground }}
                >
                  {confirmLabel ?? MIND_COPY.save}
                </Text>
              </PressableScale>
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
