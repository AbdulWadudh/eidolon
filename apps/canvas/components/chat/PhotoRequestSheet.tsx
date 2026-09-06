import { CHAT, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, Text, TextInput, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Image01Icon, RefreshIcon, SentIcon } from "@/lib/icons";
import type { PhotoOrientation } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export interface PhotoRequestSheetProps {
  isOpen: boolean;
  characterId: string;
  characterName: string;
  ideas: string[];
  areIdeasLoading: boolean;
  editing?: string | null;
  onRequestIdeas: () => void;
  onClose: () => void;
  onSubmit: (situation: string, orientation: PhotoOrientation) => void;
}

const ORIENTATIONS: { value: PhotoOrientation; label: string; hint: string; ratio: number }[] = [
  { value: "portrait", label: "Upright", hint: "Her, close up", ratio: 3 / 4 },
  { value: "landscape", label: "Wide", hint: "Where she is", ratio: 4 / 3 },
];

export function PhotoRequestSheet({
  isOpen,
  characterId,
  characterName,
  ideas,
  areIdeasLoading,
  editing,
  onRequestIdeas,
  onClose,
  onSubmit,
}: PhotoRequestSheetProps) {
  const theme = useResolvedTheme(characterId);
  const reduced = useReducedMotion();
  const [orientation, setOrientation] = React.useState<PhotoOrientation | null>(null);
  const [situation, setSituation] = React.useState("");

  React.useEffect(() => {
    if (!isOpen) {
      setOrientation(null);
      setSituation("");
    }
  }, [isOpen]);

  const chooseOrientation = React.useCallback(
    (value: PhotoOrientation) => {
      setOrientation(value);
      if (ideas.length === 0 && !areIdeasLoading) onRequestIdeas();
    },
    [ideas.length, areIdeasLoading, onRequestIdeas],
  );

  const send = React.useCallback(() => {
    if (!orientation) return;
    onSubmit(situation.trim(), orientation);
    onClose();
  }, [orientation, situation, onSubmit, onClose]);

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        {/* The sheet lives in a Modal, which sits outside the provider wrapping
            the chat screen, so it has to do its own keyboard avoidance or the
            description field opens underneath the keyboard. */}
        <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
          <Pressable accessibilityLabel="Close" className="flex-1" onPress={onClose} />

          <Animated.View
            entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
            className="rounded-t-card border-border border-t bg-card px-4 pt-4 pb-8"
          >
            <View className="mb-4 flex-row items-center gap-2">
              <AppIcon icon={Image01Icon} size={18} color={theme.primary} strokeWidth={2} />
              <Text className="font-ui-bold text-sm text-text-primary">
                {orientation
                  ? editing
                    ? "What should change?"
                    : "What of?"
                  : editing
                    ? "Change this photo"
                    : `Ask ${characterName} for a photo`}
              </Text>
            </View>

            {orientation ? (
              <Situation
                characterId={characterId}
                editing={editing}
                value={situation}
                ideas={ideas}
                areIdeasLoading={areIdeasLoading}
                onChange={setSituation}
                onReroll={onRequestIdeas}
                onSend={send}
              />
            ) : (
              <View className="flex-row gap-3">
                {ORIENTATIONS.map((option) => (
                  <PressableScale
                    key={option.value}
                    accessibilityRole="button"
                    accessibilityLabel={`${option.label}. ${option.hint}`}
                    onPress={() => chooseOrientation(option.value)}
                    className="flex-1 items-center gap-2 border border-border bg-input p-3"
                    style={{ borderRadius: theme.radius }}
                  >
                    <View
                      className="border border-primary/40 bg-card"
                      style={{
                        width: 44 * Math.min(1, option.ratio),
                        height: 44 / Math.max(1, option.ratio),
                        borderRadius: theme.radius / 2,
                      }}
                    />
                    <Text className="font-ui-bold text-sm text-text-primary">{option.label}</Text>
                    <Text className="font-ui text-text-muted text-xs">{option.hint}</Text>
                  </PressableScale>
                ))}
              </View>
            )}
          </Animated.View>
        </KeyboardAvoidingView>
      </Animated.View>
    </Modal>
  );
}

function Situation({
  characterId,
  editing,
  value,
  ideas,
  areIdeasLoading,
  onChange,
  onReroll,
  onSend,
}: {
  characterId: string;
  editing?: string | null;
  value: string;
  ideas: string[];
  areIdeasLoading: boolean;
  onChange: (next: string) => void;
  onReroll: () => void;
  onSend: () => void;
}) {
  const theme = useResolvedTheme(characterId);

  return (
    <View>
      <View className="mb-3 flex-row flex-wrap gap-2">
        {areIdeasLoading && ideas.length === 0
          ? [0, 1, 2].map((key) => (
              <View
                key={key}
                className="h-8 bg-input"
                style={{ width: 96 + key * 24, borderRadius: theme.radius }}
              />
            ))
          : ideas.map((idea) => (
              <PressableScale
                key={idea}
                accessibilityRole="button"
                accessibilityLabel={`Ask for ${idea}`}
                onPress={() => onChange(idea)}
                className="border border-border bg-input px-3 py-2"
                style={{
                  borderRadius: theme.radius,
                  borderColor: value === idea ? theme.primary : theme.cardBorder,
                }}
              >
                <Text className="font-ui text-text-primary text-xs">{idea}</Text>
              </PressableScale>
            ))}
      </View>

      <View className="flex-row items-end gap-2">
        <TextInput
          accessibilityLabel="Describe the photo"
          multiline
          value={value}
          onChangeText={onChange}
          placeholder={editing ? "What is different this time" : "Describe it, or leave it to her"}
          placeholderTextColor={theme.textMuted}
          cursorColor={theme.primary}
          selectionColor={theme.primary}
          className="flex-1 border border-border bg-input px-3 font-main text-base text-text-primary"
          style={{
            borderRadius: theme.radius,
            maxHeight: 96,
            paddingVertical: 10,
            includeFontPadding: false,
          }}
        />

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Reroll ideas"
          onPress={onReroll}
          className="items-center justify-center border border-border bg-input"
          style={{
            width: CHAT.sendButtonPx,
            height: CHAT.sendButtonPx,
            borderRadius: theme.radius,
          }}
        >
          <AppIcon icon={RefreshIcon} size={18} color={theme.textMuted} strokeWidth={2} />
        </PressableScale>

        <PressableScale
          accessibilityRole="button"
          accessibilityLabel="Ask for the photo"
          onPress={onSend}
          className="items-center justify-center"
          style={{
            width: CHAT.sendButtonPx,
            height: CHAT.sendButtonPx,
            borderRadius: theme.radius,
            backgroundColor: theme.primary,
          }}
        >
          <AppIcon icon={SentIcon} size={18} color={theme.primaryForeground} strokeWidth={2} />
        </PressableScale>
      </View>
    </View>
  );
}
