import { CHARACTER_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Modal, Pressable, ScrollView, Text, View } from "react-native";
import { VariableContextProvider } from "react-native-css";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import Animated, {
  FadeIn,
  FadeInDown,
  SlideInDown,
  SlideOutDown,
  useReducedMotion,
} from "react-native-reanimated";
import { SafeAreaView } from "react-native-safe-area-context";
import { CharacterSettingsBody } from "@/components/chat/CharacterSettingsBody";
import { CharacterSettingsHeader } from "@/components/chat/CharacterSettingsHeader";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/ui/segmented";
import { useFieldAuthor } from "@/hooks/use-field-author";
import { tap } from "@/services/haptics";
import {
  type CharacterCard,
  fetchCharacter,
  publishCharacter,
  saveCharacter,
} from "@/store/character-api";
import { changedKeys, type Draft, EMPTY_DRAFT } from "@/store/character-draft";
import type { AvatarCropRect } from "@/store/chat-photos";
import { useConnectionStore } from "@/store/connection";
import { useResolvedTheme, useThemeCssVars } from "@/store/theme-store";
import {
  SECTION_OPTIONS,
  SECTIONS,
  type SectionKey,
  sectionBlurb,
} from "./character-settings-sections";

const SETTINGS_PADDING_PX = 20;

export interface CharacterSettingsSheetProps {
  isOpen: boolean;
  characterId: string;
  avatarUrl?: string | null;
  avatarCrop?: AvatarCropRect | null;
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
  avatarUrl = null,
  avatarCrop = null,
  onClose,
  onOpenTheme,
  onForked,
}: CharacterSettingsSheetProps) {
  const reduced = useReducedMotion();
  // A Modal mounts in its own native view hierarchy, so the theme variables set
  // at the app root never reach it. Without this the whole screen falls back to
  // defaults and renders white on white.
  const cssVars = useThemeCssVars(characterId);
  const theme = useResolvedTheme(characterId);
  const serverHost = useConnectionStore((state) => state.serverHost);
  const pairingToken = useConnectionStore((state) => state.pairingToken);

  const [card, setCard] = React.useState<CharacterCard | null>(null);
  const [isMine, setIsMine] = React.useState(true);
  const [draft, setDraft] = React.useState<Draft>(EMPTY_DRAFT);
  const [section, setSection] = React.useState<SectionKey>("identity");
  const [busy, setBusy] = React.useState(false);
  const [note, setNote] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!isOpen) return;
    setSection("identity");
    setNote(null);
    setPortrait(avatarUrl);

    void fetchCharacter(serverHost, characterId, pairingToken).then((next) => {
      setCard(next?.card ?? null);
      setIsMine(next?.isMine ?? true);
      setDraft(next ? toDraft(next.card) : EMPTY_DRAFT);
      if (!next) setNote(CHARACTER_COPY.failed);
    });
  }, [isOpen, serverHost, characterId, pairingToken, avatarUrl]);

  const dirty = changedKeys(draft, card ? toDraft(card) : null);

  const ownerNote = !isMine
    ? CHARACTER_COPY.ownerTheirs
    : card?.forkedFrom
      ? CHARACTER_COPY.forkedNote
      : card?.ownerId
        ? CHARACTER_COPY.ownerYou
        : CHARACTER_COPY.ownerUnclaimed;

  const change = React.useCallback((patch: Partial<Draft>) => {
    setDraft((current) => ({ ...current, ...patch }));
    setNote(null);
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
    setIsMine(true);
    setDraft(toDraft(result.character));
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

  const discard = React.useCallback(() => {
    if (card) setDraft(toDraft(card));
    setNote(null);
  }, [card]);

  const [portrait, setPortrait] = React.useState<string | null>(avatarUrl);

  const author = useFieldAuthor(serverHost, draft, change);

  const _spec = SECTIONS[section];

  return (
    <Modal
      visible={isOpen}
      animationType="none"
      presentationStyle="fullScreen"
      onRequestClose={onClose}
    >
      <VariableContextProvider value={cssVars}>
        <SafeAreaView
          edges={["top", "bottom"]}
          className="flex-1 bg-canvas"
          style={{ flex: 1, backgroundColor: theme.canvas }}
        >
          <Animated.View
            entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
            className="flex-1"
          >
            <CharacterSettingsHeader
              characterId={characterId}
              name={draft.name}
              ownerNote={ownerNote}
              avatarUrl={portrait}
              avatarCrop={portrait === avatarUrl ? avatarCrop : null}
              onBack={onClose}
              onOpenTheme={onOpenTheme}
            />

            <View className="pt-3" style={{ paddingHorizontal: SETTINGS_PADDING_PX }}>
              <Segmented
                options={SECTION_OPTIONS}
                value={section}
                onChange={setSection}
                characterId={characterId}
                accessibilityLabel={CHARACTER_COPY.editTitle}
              />
              <Text className="mt-2.5 font-ui text-[11px] text-text-muted leading-4">
                {isMine ? sectionBlurb(section) : CHARACTER_COPY.theirsEditable}
              </Text>
            </View>

            <KeyboardAvoidingView behavior="padding" automaticOffset style={{ flex: 1 }}>
              <ScrollView
                // Horizontal padding belongs on the content, not the frame: on
                // a ScrollView the frame's inset does not travel with the
                // scrolled content, which is what left the fields against the
                // edge of the screen.
                contentContainerStyle={{
                  paddingHorizontal: SETTINGS_PADDING_PX,
                  paddingTop: 16,
                  paddingBottom: dirty.length > 0 ? 96 : 32,
                }}
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={false}
              >
                <CharacterSettingsBody
                  section={section}
                  characterId={characterId}
                  serverHost={serverHost}
                  draft={draft}
                  author={author}
                  isPublic={card?.isPublic === true}
                  isMine={isMine}
                  portrait={portrait}
                  onChange={change}
                  onPublish={(next) => void publish(next)}
                  onPortrait={setPortrait}
                />

                {note ? (
                  <Animated.Text
                    entering={reduced ? undefined : FadeInDown.duration(UI_MS.disclosure)}
                    accessibilityLiveRegion="polite"
                    className="mt-5 font-ui text-[12px] text-text-muted"
                  >
                    {note}
                  </Animated.Text>
                ) : null}
              </ScrollView>
            </KeyboardAvoidingView>

            {dirty.length > 0 ? (
              <Animated.View
                entering={reduced ? undefined : SlideInDown.duration(UI_MS.disclosure)}
                exiting={reduced ? undefined : SlideOutDown.duration(UI_MS.revealReduced)}
                className="absolute right-0 bottom-0 left-0 flex-row items-center gap-3 border-border border-t bg-card pt-3 pb-5"
                style={{ paddingHorizontal: SETTINGS_PADDING_PX }}
              >
                <View className="flex-1">
                  <Text className="font-ui-medium text-[12px] text-text-primary">
                    {dirty.length === 1
                      ? CHARACTER_COPY.unsavedOne
                      : CHARACTER_COPY.unsavedMany.replace("%d", String(dirty.length))}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={CHARACTER_COPY.discard}
                    hitSlop={8}
                    onPress={discard}
                  >
                    <Text className="mt-0.5 font-ui text-[11px] text-text-muted underline">
                      {CHARACTER_COPY.discard}
                    </Text>
                  </Pressable>
                </View>

                <Button
                  variant="default"
                  size="default"
                  disabled={busy || draft.name.trim().length === 0}
                  onPress={() => void save()}
                >
                  {busy ? CHARACTER_COPY.saving : CHARACTER_COPY.save}
                </Button>
              </Animated.View>
            ) : null}
          </Animated.View>
        </SafeAreaView>
      </VariableContextProvider>
    </Modal>
  );
}
