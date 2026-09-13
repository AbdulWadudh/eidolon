import { AUTHOR_COPY, CHARACTER_COPY, DASHBOARD_COPY, MIND_COPY } from "@eidolon/config";
import * as React from "react";
import { Text, View } from "react-native";
import { CharacterForm, type Draft } from "@/components/characters/CharacterForm";
import { PortraitStudio } from "@/components/characters/PortraitStudio";
import { PronounPicker } from "@/components/characters/PronounPicker";
import { LoreSection } from "@/components/chat/mind/LoreSection";
import { CollapsibleSection } from "@/components/ui/collapsible-section";
import { SwitchRow } from "@/components/ui/switch";
import type { AdminCharacter } from "@/store/admin-api";
import {
  createLore,
  fetchMind,
  type LoreDraft,
  type LoreView,
  removeLore,
  updateLore,
} from "@/store/mind-api";
import { useResolvedTheme } from "@/store/theme-store";

export interface AdminCharacterEditorProps {
  character: AdminCharacter;
  draft: Draft;
  serverHost: string;
  avatarUrl: string | null;
  onChange: (patch: Partial<Draft>) => void;
  onPublish: (isPublic: boolean) => void;
  onPortrait: (url: string) => void;
}

const SECTIONS = { card: "card", look: "look", lore: "lore", sharing: "sharing" } as const;

export function AdminCharacterEditor({
  character,
  draft,
  serverHost,
  avatarUrl,
  onChange,
  onPublish,
  onPortrait,
}: AdminCharacterEditorProps) {
  const theme = useResolvedTheme(character.id);
  const [open, setOpen] = React.useState<string | null>(SECTIONS.card);
  const [lore, setLore] = React.useState<LoreView[]>([]);

  const toggle = React.useCallback((key: string) => {
    setOpen((prev) => (prev === key ? null : key));
  }, []);

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

  return (
    <View className="gap-2">
      <CollapsibleSection
        sectionKey={SECTIONS.card}
        title={CHARACTER_COPY.newCharacter}
        expanded={open === SECTIONS.card}
        onToggle={toggle}
        chevronColor={theme.textMuted}
        className="rounded-card border border-border p-3"
      >
        <View className="gap-3">
          <CharacterForm
            draft={draft}
            serverHost={serverHost}
            characterId={character.id}
            compact
            onChange={onChange}
          />
          <View className="h-px bg-border" />
          <PronounPicker
            characterId={character.id}
            value={draft.pronouns}
            onChange={(pronouns) => onChange({ pronouns })}
          />
        </View>
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey={SECTIONS.look}
        title={AUTHOR_COPY.portraitTitle}
        expanded={open === SECTIONS.look}
        onToggle={toggle}
        chevronColor={theme.textMuted}
        className="rounded-card border border-border p-3"
      >
        <PortraitStudio
          characterId={character.id}
          serverHost={serverHost}
          avatarUrl={avatarUrl}
          onPortrait={onPortrait}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey={SECTIONS.lore}
        title={MIND_COPY.loreHeading}
        badge={
          lore.length > 0 ? (
            <Text className="font-ui-medium text-[10px] text-primary">{lore.length}</Text>
          ) : null
        }
        expanded={open === SECTIONS.lore}
        onToggle={toggle}
        chevronColor={theme.textMuted}
        className="rounded-card border border-border p-3"
      >
        <LoreSection
          characterId={character.id}
          entries={lore}
          serverHost={serverHost}
          onSave={saveLore}
          onDelete={dropLore}
        />
      </CollapsibleSection>

      <CollapsibleSection
        sectionKey={SECTIONS.sharing}
        title={DASHBOARD_COPY.charactersTitle}
        expanded={open === SECTIONS.sharing}
        onToggle={toggle}
        chevronColor={theme.textMuted}
        className="rounded-card border border-border p-3"
      >
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
      </CollapsibleSection>
    </View>
  );
}
