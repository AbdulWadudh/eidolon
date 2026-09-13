import { MOMENT_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AuthorActions, textAuthorActions } from "@/components/common/authored-field";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { useTextAuthor } from "@/hooks/use-text-author";
import { Cancel01Icon } from "@/lib/icons";
import { useResolvedTheme } from "@/store/theme-store";

export interface MomentSheetProps {
  isOpen: boolean;
  characterId: string;
  serverHost: string;
  onClose: () => void;
  onSend: (place: string) => Promise<string | null>;
}

export function MomentSheet({
  isOpen,
  characterId,
  serverHost,
  onClose,
  onSend,
}: MomentSheetProps) {
  const theme = useResolvedTheme(characterId);
  const author = useTextAuthor(serverHost, "place", { characterId });
  const reduced = useReducedMotion();
  const [place, setPlace] = React.useState("");
  const [isSending, setSending] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (isOpen) {
      setPlace("");
      setError(null);
      setSending(false);
    }
  }, [isOpen]);

  const trimmed = place.trim();

  const send = React.useCallback(async () => {
    if (trimmed.length === 0) {
      setError(MOMENT_COPY.needPlace);
      return;
    }

    setSending(true);
    setError(null);

    const failure = await onSend(trimmed);

    if (failure) {
      setError(failure);
      setSending(false);
      return;
    }

    onClose();
  }, [onClose, onSend, trimmed]);

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
              {MOMENT_COPY.title}
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
            {MOMENT_COPY.blurb}
          </Text>

          <Input
            value={place}
            onChangeText={(next) => {
              setPlace(next);
              setError(null);
            }}
            editable={!isSending}
            placeholder={MOMENT_COPY.placeholder}
            accessibilityLabel={MOMENT_COPY.title}
            returnKeyType="go"
            onSubmitEditing={() => void send()}
            trailing={
              <AuthorActions
                characterId={characterId}
                {...textAuthorActions(author, place, (text) => {
                  setPlace(text);
                  setError(null);
                })}
              />
            }
          />

          {error ? (
            <Text
              accessibilityLiveRegion="assertive"
              className="mt-2 font-ui text-[11px]"
              style={{ color: theme.danger }}
            >
              {error}
            </Text>
          ) : null}

          <Button
            variant="default"
            size="sm"
            className="mt-3"
            disabled={isSending || trimmed.length === 0}
            onPress={() => void send()}
          >
            {isSending ? (
              <View className="flex-row items-center gap-2">
                <ActivityIndicator size="small" color={theme.primaryForeground} />
                <Text className="font-ui-medium text-primary-foreground text-sm">
                  {MOMENT_COPY.working}
                </Text>
              </View>
            ) : (
              MOMENT_COPY.send
            )}
          </Button>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
