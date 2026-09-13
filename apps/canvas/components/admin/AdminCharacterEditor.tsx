import { CHARACTER_COPY, MIND_COPY, UI_MS } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { CharacterFields } from "@/components/characters/CharacterFields";
import { PortraitStudio } from "@/components/characters/PortraitStudio";
import { PronounPicker } from "@/components/characters/PronounPicker";
import {
  SECTION_OPTIONS,
  SECTIONS,
  type SectionKey,
  sectionBlurb,
} from "@/components/chat/character-settings-sections";
import { LoreSection } from "@/components/chat/mind/LoreSection";
import { Segmented } from "@/components/ui/segmented";
import { SwitchRow } from "@/components/ui/switch";
import { VoicePicker } from "@/components/ui/voice-picker";
import { useFieldAuthor } from "@/hooks/use-field-author";
import type { AdminCharacter } from "@/store/admin-api";
import type { Draft } from "@/store/character-draft";
import {
  createLore,
  fetchMind,
  type LoreDraft,
  type LoreView,
  removeLore,
  updateLore,
} from "@/store/mind-api";

export interface AdminCharacterEditorProps {
  character: AdminCharacter;
  draft: Draft;
  serverHost: string;
  avatarUrl: string | null;
  onChange: (patch: Partial<Draft>) => void;
  onPublish: (isPublic: boolean) => void;
  onPortrait: (url: string) => void;
}

export function AdminCharacterEditor({
  character,
  draft,
  serverHost,
  avatarUrl,
  onChange,
  onPublish,
  onPortrait,
}: AdminCharacterEditorProps) {
  const reduced = useReducedMotion();
  const author = useFieldAuthor(serverHost, draft, onChange);
  const [section, setSection] = React.useState<SectionKey>("identity");
  const [lore, setLore] = React.useState<LoreView[]>([]);

  const reloadLore = React.useCallback(() => {
    void Promise.resolve(fetchMind(serverHost, character.id)).then((mind) => {
      if (mind) setLore(mind.lore);
    });
  }, [character.id, serverHost]);

  React.useEffect(reloadLore, [reloadLore]);

  const saveLore = React.useCallback(
    (entryId: string | null, entry: LoreDraft) => {
      const request = entryId
        ? updateLore(serverHost, character.id, entryId, entry)
        : createLore(serverHost, character.id, entry);
      void Promise.resolve(request).then(reloadLore);
    },
    [character.id, reloadLore, serverHost],
  );

  const dropLore = React.useCallback(
    (entryId: string) => {
      void Promise.resolve(removeLore(serverHost, character.id, entryId)).then(reloadLore);
    },
    [character.id, reloadLore, serverHost],
  );

  const fields = SECTIONS[section].fields;

  return (
    <View className="gap-3">
      <Segmented
        options={SECTION_OPTIONS}
        value={section}
        onChange={setSection}
        characterId={character.id}
        accessibilityLabel={CHARACTER_COPY.editTitle}
      />

      <Text className="font-ui text-[11px] text-text-muted leading-4">{sectionBlurb(section)}</Text>

      <Animated.View
        key={section}
        entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
        exiting={reduced ? undefined : FadeOut.duration(UI_MS.revealReduced)}
        className="gap-4"
      >
        {fields.length > 0 ? (
          <CharacterFields
            keys={fields}
            draft={draft}
            characterId={character.id}
            author={author}
            compact
            onChange={onChange}
          />
        ) : null}

        {section === "identity" ? (
          <View className="gap-4 border-border border-t pt-4">
            <PronounPicker
              characterId={character.id}
              value={draft.pronouns}
              onChange={(pronouns) => onChange({ pronouns })}
            />
            <PortraitStudio
              characterId={character.id}
              serverHost={serverHost}
              avatarUrl={avatarUrl}
              onPortrait={onPortrait}
            />
          </View>
        ) : null}

        {section === "mind" ? (
          <View className="gap-3 border-border border-t pt-4">
            <View className="flex-row items-center justify-between">
              <Text className="font-ui-bold text-[11px] text-text-muted uppercase tracking-wider">
                {MIND_COPY.loreHeading}
              </Text>
              {lore.length > 0 ? (
                <Text className="font-ui-medium text-[10px] text-primary">{lore.length}</Text>
              ) : null}
            </View>
            <LoreSection
              characterId={character.id}
              entries={lore}
              serverHost={serverHost}
              onSave={saveLore}
              onDelete={dropLore}
            />
          </View>
        ) : null}

        {section === "voice" ? (
          <VoicePicker
            characterId={character.id}
            serverHost={serverHost}
            value={draft.voice}
            onChange={(voice) => onChange({ voice })}
          />
        ) : null}

        {section === "misc" ? (
          <View className="gap-3">
            <SwitchRow
              characterId={character.id}
              label={CHARACTER_COPY.publishLabel}
              hint={CHARACTER_COPY.publishHint}
              value={character.isPublic}
              onValueChange={onPublish}
              accessibilityLabel={CHARACTER_COPY.publishLabel}
            />
            <Text className="font-ui text-[10px] text-text-muted">{character.id}</Text>
          </View>
        ) : null}
      </Animated.View>
    </View>
  );
}
