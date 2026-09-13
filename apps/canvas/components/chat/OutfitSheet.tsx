import { AUTHOR_COPY, OUTFIT_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { Cancel01Icon, MagicWand01Icon, SparklesIcon } from "@/lib/icons";
import { authorField } from "@/store/author-api";
import { useResolvedTheme } from "@/store/theme-store";

export interface OutfitSheetProps {
  isOpen: boolean;
  characterId: string;
  characterName: string;
  serverHost: string;
  outfit: string | null;
  onClose: () => void;
  onApply: (outfit: string | null) => void;
}

const AUTHOR_PX = 30;

export function OutfitSheet({
  isOpen,
  characterId,
  characterName,
  serverHost,
  outfit,
  onClose,
  onApply,
}: OutfitSheetProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [draft, setDraft] = React.useState("");
  const [isWriting, setWriting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setDraft(outfit ?? "");
      setError(null);
    }
  }, [isOpen, outfit]);

  const trimmed = draft.trim();

  const write = React.useCallback(
    async (mode: "suggest" | "enhance") => {
      setWriting(true);
      setError(null);

      const result = await authorField(serverHost, "outfit", mode, trimmed, {
        name: characterName,
      });

      if (result.text) setDraft(result.text);
      else if (result.error) setError(result.error);
      setWriting(false);
    },
    [characterName, serverHost, trimmed],
  );

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
      >
        <Pressable accessibilityLabel="Close" className="flex-1" onPress={onClose} />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="overflow-hidden rounded-t-card border-border border-t px-4 pt-3 pb-7"
        >
          <GlassSurface tint="card" overlay pointerEvents="none" style={StyleSheet.absoluteFill} />

          <View className="mb-2 flex-row items-center justify-between">
            <Text className="font-ui-bold text-[11px] text-text-muted uppercase tracking-[1.5px]">
              {OUTFIT_COPY.title}
            </Text>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Close"
              hitSlop={12}
              onPress={onClose}
              className="h-7 w-7 items-center justify-center rounded-full active:bg-input"
            >
              <AppIcon icon={Cancel01Icon} size={15} color={theme.textMuted} strokeWidth={1.6} />
            </PressableScale>
          </View>

          <Text className="mb-2.5 font-ui text-[11px] text-text-muted leading-[15px]">
            {OUTFIT_COPY.blurb}
          </Text>

          <View className="mb-1.5 flex-row items-center justify-end gap-1.5">
            {isWriting ? (
              <ActivityIndicator size="small" color={theme.primary} />
            ) : (
              <>
                {trimmed.length > 0 ? (
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`${AUTHOR_COPY.enhance}: ${OUTFIT_COPY.title}`}
                    hitSlop={8}
                    onPress={() => void write("enhance")}
                    style={{ height: AUTHOR_PX, width: AUTHOR_PX }}
                    className="items-center justify-center rounded-button border border-border bg-input"
                  >
                    <AppIcon icon={MagicWand01Icon} size={14} color={theme.textPrimary} />
                  </PressableScale>
                ) : null}

                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`${AUTHOR_COPY.suggest}: ${OUTFIT_COPY.title}`}
                  hitSlop={8}
                  onPress={() => void write("suggest")}
                  style={{ height: AUTHOR_PX, width: AUTHOR_PX }}
                  className="items-center justify-center rounded-button border border-border bg-input"
                >
                  <AppIcon icon={SparklesIcon} size={14} color={theme.primary} />
                </PressableScale>
              </>
            )}
          </View>

          <Input
            value={draft}
            onChangeText={setDraft}
            editable={!isWriting}
            placeholder={OUTFIT_COPY.placeholder}
            accessibilityLabel={OUTFIT_COPY.title}
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={() => onApply(trimmed || null)}
          />

          <Text
            className="mt-2 font-ui text-[11px]"
            style={{ color: error ? theme.danger : theme.textMuted }}
            accessibilityLiveRegion={error ? "assertive" : "polite"}
          >
            {error ?? (outfit ? `${OUTFIT_COPY.wearingNow}: ${outfit}` : OUTFIT_COPY.varies)}
          </Text>

          <View className="mt-3 flex-row gap-2">
            {outfit ? (
              <Button
                variant="secondary"
                size="sm"
                className="flex-1"
                onPress={() => onApply(null)}
              >
                {OUTFIT_COPY.clear}
              </Button>
            ) : null}

            <Button
              variant="default"
              size="sm"
              className="flex-1"
              disabled={trimmed === (outfit ?? "")}
              onPress={() => onApply(trimmed || null)}
            >
              {OUTFIT_COPY.save}
            </Button>
          </View>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
