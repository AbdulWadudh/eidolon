import { ADMIN_COPY, MIND_COPY, UI_MS } from "@eidolon/config";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SwitchRow } from "@/components/ui/switch";
import { Cancel01Icon } from "@/lib/icons";
import { useAdminStore } from "@/store/admin-store";
import { useResolvedTheme } from "@/store/theme-store";

export interface AdminSheetProps {
  isOpen: boolean;
  characterId: string;
  onClose: () => void;
}

export function AdminSheet({ isOpen, characterId, onClose }: AdminSheetProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  const canEditAnyMessage = useAdminStore((state) => state.canEditAnyMessage);
  const canSpeakAnyMessage = useAdminStore((state) => state.canSpeakAnyMessage);
  const setEditAnyMessage = useAdminStore((state) => state.setEditAnyMessage);
  const setSpeakAnyMessage = useAdminStore((state) => state.setSpeakAnyMessage);

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
      >
        <Pressable accessibilityLabel={MIND_COPY.closeLabel} className="flex-1" onPress={onClose} />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="overflow-hidden rounded-t-card border-border border-t px-4 pt-4 pb-8"
        >
          <GlassSurface tint="card" overlay pointerEvents="none" style={StyleSheet.absoluteFill} />

          <View className="mb-1 flex-row items-start justify-between">
            <View className="flex-1 pr-3">
              <Text className="font-ui-bold text-text-muted text-xs uppercase tracking-[1.5px]">
                {ADMIN_COPY.title}
              </Text>
              <Text className="mt-1 font-ui text-[11px] text-text-muted leading-4">
                {ADMIN_COPY.blurb}
              </Text>
            </View>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={MIND_COPY.closeLabel}
              hitSlop={12}
              onPress={onClose}
              className="h-8 w-8 items-center justify-center rounded-full border border-border"
            >
              <AppIcon icon={Cancel01Icon} size={16} color={theme.textMuted} />
            </PressableScale>
          </View>

          <View className="mt-4 gap-3 border-border border-t pt-4">
            <SwitchRow
              characterId={characterId}
              label={ADMIN_COPY.editAnyLabel}
              hint={ADMIN_COPY.editAnyHint}
              value={canEditAnyMessage}
              onValueChange={setEditAnyMessage}
              accessibilityLabel={ADMIN_COPY.editAnyLabel}
            />

            <SwitchRow
              characterId={characterId}
              label={ADMIN_COPY.speakAnyLabel}
              hint={ADMIN_COPY.speakAnyHint}
              value={canSpeakAnyMessage}
              onValueChange={setSpeakAnyMessage}
              accessibilityLabel={ADMIN_COPY.speakAnyLabel}
            />
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
