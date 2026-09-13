import { ADMIN_COPY, MIND_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { GlassSurface } from "@/components/ui/glass-surface";
import { SwitchRow } from "@/components/ui/switch";
import { Cancel01Icon } from "@/lib/icons";
import { fetchConfig, saveConfigValue } from "@/store/admin-api";
import { useAdminStore } from "@/store/admin-store";
import { useIsOwner } from "@/store/auth-store";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";
import { useToastStore } from "@/store/toast-store";

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

  const isOwner = useIsOwner();
  const serverHost = useConnectionStore((state) => state.serverHost);
  const sessionToken = useConnectionStore((state) => state.sessionToken);
  const [momentRepaints, setMomentRepaints] = React.useState<boolean | null>(null);

  React.useEffect(() => {
    if (!isOpen || !isOwner || !serverHost || !sessionToken) return;

    let live = true;
    void fetchConfig(serverHost, sessionToken)
      .then((view) => {
        if (!live) return;
        const setting = view.settings.find(
          (entry) => entry.path === ADMIN_COPY.momentBackgroundPath,
        );
        setMomentRepaints(setting?.value === true);
      })
      .catch(() => undefined);

    return () => {
      live = false;
    };
  }, [isOpen, isOwner, serverHost, sessionToken]);

  const setMomentBackground = React.useCallback(
    (enabled: boolean) => {
      setMomentRepaints(enabled);

      void saveConfigValue(
        serverHost,
        sessionToken,
        ADMIN_COPY.momentBackgroundPath,
        enabled,
      ).catch(() => {
        setMomentRepaints(!enabled);
        useToastStore.getState().notify(ADMIN_COPY.ownerOnly, "bad");
      });
    },
    [serverHost, sessionToken],
  );

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

            {isOwner && momentRepaints !== null ? (
              <SwitchRow
                characterId={characterId}
                label={ADMIN_COPY.momentBackgroundLabel}
                hint={ADMIN_COPY.momentBackgroundHint}
                value={momentRepaints}
                onValueChange={setMomentBackground}
                accessibilityLabel={ADMIN_COPY.momentBackgroundLabel}
              />
            ) : null}
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
