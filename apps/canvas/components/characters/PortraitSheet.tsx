import { AUTHOR_COPY, GALLERY_COPY, UI_MS } from "@eidolon/config";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, SlideInDown, useReducedMotion } from "react-native-reanimated";
import { PortraitStudio } from "@/components/characters/PortraitStudio";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Cancel01Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface PortraitSheetProps {
  isOpen: boolean;
  characterId: string;
  serverHost: string;
  avatarUrl: string | null;
  onClose: () => void;
  onPortrait: (url: string) => void;
}

/**
 * The portrait generator, reachable from her profile rather than only from a
 * section of her settings. It is the page you are on when you decide her picture
 * is wrong, so it is the page that should offer to change it.
 */
export function PortraitSheet({
  isOpen,
  characterId,
  serverHost,
  avatarUrl,
  onClose,
  onPortrait,
}: PortraitSheetProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.6)" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={GALLERY_COPY.closeLabel}
          className="flex-1"
          onPress={onClose}
        />

        <Animated.View
          entering={reduced ? undefined : SlideInDown.duration(UI_MS.reveal)}
          className="max-h-[85%] rounded-t-card border-border border-t bg-card"
        >
          <View className="flex-row items-center gap-3 border-border border-b px-4 py-4">
            <Text className="flex-1 font-main-bold text-base text-text-primary">
              {AUTHOR_COPY.portraitTitle}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={GALLERY_COPY.closeLabel}
              hitSlop={10}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full border border-border"
            >
              <AppIcon icon={Cancel01Icon} size={18} color={theme.textMuted} />
            </PressableScale>
          </View>

          <ScrollView
            className="px-4"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 32 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <PortraitStudio
              characterId={characterId}
              serverHost={serverHost}
              avatarUrl={avatarUrl}
              onPortrait={onPortrait}
            />
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
