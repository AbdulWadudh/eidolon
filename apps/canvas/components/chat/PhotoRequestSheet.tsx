import { MIND_COPY, PHOTO_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { AuthorActions, textAuthorActions } from "@/components/common/authored-field";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { GlassSurface } from "@/components/ui/glass-surface";
import { Input } from "@/components/ui/input";
import { type TextAuthor, useTextAuthor } from "@/hooks/use-text-author";
import { Cancel01Icon, Image01Icon, RefreshIcon } from "@/lib/icons";
import type { PhotoOrientation } from "@/store/chat-photos";
import { useResolvedTheme } from "@/store/theme-store";

export interface PhotoRequestSheetProps {
  serverHost: string;
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
  { value: "portrait", label: "Upright", hint: "Close up", ratio: 3 / 4 },
  { value: "landscape", label: "Wide", hint: "The whole scene", ratio: 4 / 3 },
];

export function PhotoRequestSheet({
  isOpen,
  characterId,
  serverHost,
  characterName,
  ideas,
  areIdeasLoading,
  editing,
  onRequestIdeas,
  onClose,
  onSubmit,
}: PhotoRequestSheetProps) {
  const theme = useResolvedTheme(characterId);
  const author = useTextAuthor(serverHost, editing ? "photoEdit" : "photo", { characterId });
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
      if (!areIdeasLoading) onRequestIdeas();
    },
    [areIdeasLoading, onRequestIdeas],
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
        style={{ backgroundColor: "rgba(0,0,0,0.72)" }}
      >
        {}
        <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
          <Pressable accessibilityLabel="Close" className="flex-1" onPress={onClose} />

          <Animated.View
            entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
            className="overflow-hidden rounded-t-card border-border border-t px-4 pt-4 pb-8"
          >
            <GlassSurface
              tint="card"
              overlay
              pointerEvents="none"
              style={StyleSheet.absoluteFill}
            />
            <View className="mb-4 flex-row items-center gap-2">
              <AppIcon icon={Image01Icon} size={18} color={theme.primary} strokeWidth={2} />
              <Text className="flex-1 font-ui-bold text-sm text-text-primary">
                {orientation
                  ? editing
                    ? "What should change?"
                    : "What of?"
                  : editing
                    ? "Change this photo"
                    : `Ask ${characterName} for a photo`}
              </Text>
              {orientation ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Reroll ideas"
                  accessibilityState={{ busy: areIdeasLoading }}
                  hitSlop={10}
                  onPress={onRequestIdeas}
                  className="items-center justify-center"
                >
                  <AppIcon icon={RefreshIcon} size={16} color={theme.textMuted} strokeWidth={1.6} />
                </PressableScale>
              ) : null}

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

            {orientation ? (
              <Situation
                characterId={characterId}
                author={author}
                editing={editing}
                value={situation}
                ideas={ideas}
                areIdeasLoading={areIdeasLoading}
                onChange={setSituation}
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
  author,
  editing,
  value,
  ideas,
  areIdeasLoading,
  onChange,
  onSend,
}: {
  characterId: string;
  author: TextAuthor;
  editing?: string | null;
  value: string;
  ideas: string[];
  areIdeasLoading: boolean;
  onChange: (next: string) => void;
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

      <Input
        value={value}
        onChangeText={onChange}
        placeholder={editing ? PHOTO_COPY.describeEditing : PHOTO_COPY.describe}
        accessibilityLabel="Describe the photo"
        autoCapitalize="none"
        returnKeyType="send"
        onSubmitEditing={onSend}
        trailing={
          <AuthorActions
            characterId={characterId}
            {...textAuthorActions(author, value, onChange)}
          />
        }
      />

      <Button variant="default" size="sm" className="mt-3" onPress={onSend}>
        {editing ? PHOTO_COPY.askEditing : PHOTO_COPY.ask}
      </Button>
    </View>
  );
}
