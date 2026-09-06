import { CHARACTER_COPY, MIND_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import Animated, { FadeIn, FadeInDown, useReducedMotion } from "react-native-reanimated";
import { CharacterForm, type Draft, EMPTY_DRAFT } from "@/components/characters/CharacterForm";
import { AppIcon } from "@/components/common/icon";
import { PressableScale } from "@/components/common/pressable-scale";
import { Button } from "@/components/ui/button";
import { SwitchRow } from "@/components/ui/switch";
import { PaintBoardIcon } from "@/lib/icons";
import { tap } from "@/services/haptics";
import {
  type CharacterCard,
  fetchCharacter,
  publishCharacter,
  saveCharacter,
} from "@/store/character-api";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme } from "@/store/theme-store";

export interface CharacterSettingsSheetProps {
  isOpen: boolean;
  characterId: string;
  onClose: () => void;
  onOpenTheme: () => void;
  onForked: (id: string) => void;
}

function toDraft(card: CharacterCard): Draft {
  return {
    name: card.name,
    tagline: card.tagline,
    personality: card.personality,
    systemPrompt: card.systemPrompt,
    scenario: card.scenario,
    rules: card.rules,
    exampleDialogue: card.exampleDialogue,
    greeting: card.greeting,
    voice: card.voice,
  };
}

export function CharacterSettingsSheet({
  isOpen,
  characterId,
  onClose,
  onOpenTheme,
  onForked,
}: CharacterSettingsSheetProps) {
  const reduced = useReducedMotion();
  const theme = useResolvedTheme(characterId);
  const serverHost = useConnectionStore((state) => state.serverHost);
  const pairingToken = useConnectionStore((state) => state.pairingToken);

  const [card, setCard] = React.useState<CharacterCard | null>(null);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;

    void fetchCharacter(serverHost, characterId).then((next) => {
      setCard(next);
      setDraft(next ? toDraft(next) : EMPTY_DRAFT);
      setNote(next ? null : CHARACTER_COPY.failed);
    });
  }, [isOpen, serverHost, characterId]);

  const change = React.useCallback((patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
  }, []);

  const save = React.useCallback(async () => {
    setBusy(true);
    const result = await saveCharacter(serverHost, characterId, draft, pairingToken);
    setBusy(false);

    if (!result) {
      setNote(CHARACTER_COPY.failed);
      return;
    }

    tap("success");

    // A fork is a different character, so the chat has to follow it rather than
    // keep showing the one that was left untouched.
    if (result.forked) {
      onForked(result.character.id);
      return;
    }

    setCard(result.character);
    setNote(CHARACTER_COPY.saved);
  }, [serverHost, characterId, draft, pairingToken, onForked]);

  const publish = React.useCallback(
    async (isPublic: boolean) => {
      const next = await publishCharacter(serverHost, characterId, isPublic, pairingToken);
      if (next) setCard(next);
      else setNote(CHARACTER_COPY.publishRefused);
    },
    [serverHost, characterId, pairingToken],
  );

  return (
    <Modal visible={isOpen} transparent animationType="none" onRequestClose={onClose}>
      <Animated.View
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        className="flex-1 justify-end"
        style={{ backgroundColor: "rgba(0,0,0,0.55)" }}
      >
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={MIND_COPY.closeLabel}
          className="flex-1"
          onPress={onClose}
        />

        <Animated.View
          entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
          className="max-h-[90%] rounded-t-card border-border border-t bg-card"
        >
          <View className="flex-row items-center gap-2 border-border border-b px-4 py-4">
            <View className="flex-1">
              <Text className="font-main-bold text-base text-text-primary">
                {CHARACTER_COPY.editTitle}
              </Text>
              <Text className="mt-0.5 font-ui text-[11px] text-text-muted" numberOfLines={1}>
                {card?.forkedFrom ? CHARACTER_COPY.forkedNote : CHARACTER_COPY.editBlurb}
              </Text>
            </View>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={CHARACTER_COPY.themeLabel}
              hitSlop={10}
              onPress={onOpenTheme}
              className="h-10 w-10 items-center justify-center rounded-button border border-border bg-input"
            >
              <AppIcon icon={PaintBoardIcon} size={18} color={theme.primary} />
            </PressableScale>

            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={MIND_COPY.closeLabel}
              hitSlop={10}
              onPress={onClose}
              className="h-10 w-10 items-center justify-center rounded-full border border-border"
            >
              <Text className="font-ui text-sm text-text-muted">✕</Text>
            </PressableScale>
          </View>

          <ScrollView
            className="px-4"
            contentContainerStyle={{ paddingTop: 16, paddingBottom: 40, gap: 20 }}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <CharacterForm draft={draft} serverHost={serverHost} onChange={change} />

            <View className="h-px bg-border" />

            <SwitchRow
              characterId={characterId}
              label={CHARACTER_COPY.publishLabel}
              hint={CHARACTER_COPY.publishHint}
              value={card?.isPublic === true}
              onValueChange={(next) => void publish(next)}
              accessibilityLabel={CHARACTER_COPY.publishLabel}
            />

            {note ? (
              <Animated.Text
                entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
                accessibilityLiveRegion="polite"
                className="font-ui text-text-muted text-xs"
              >
                {note}
              </Animated.Text>
            ) : null}

            <Button
              variant="default"
              size="default"
              className="w-full"
              disabled={busy || draft.name.trim().length === 0}
              onPress={() => void save()}
            >
              {busy ? CHARACTER_COPY.saving : CHARACTER_COPY.save}
            </Button>
          </ScrollView>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}
