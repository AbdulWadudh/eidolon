import { UI_MS } from "@eidolon/config";
import { View } from "react-native";
import Animated, { FadeIn, FadeOut, useReducedMotion } from "react-native-reanimated";
import { CharacterFields } from "@/components/characters/CharacterFields";
import { PortraitStudio } from "@/components/characters/PortraitStudio";
import { CharacterSharingSection } from "@/components/chat/CharacterSharingSection";
import { VoicePicker } from "@/components/ui/voice-picker";
import type { FieldAuthor } from "@/hooks/use-field-author";
import type { Draft } from "@/store/character-draft";
import { SECTIONS, type SectionKey } from "./character-settings-sections";

export interface CharacterSettingsBodyProps {
  section: SectionKey;
  characterId: string;
  serverHost: string;
  draft: Draft;
  author: FieldAuthor;
  isPublic: boolean;
  isMine: boolean;
  portrait: string | null;
  onChange: (patch: Partial<Draft>) => void;
  onPublish: (isPublic: boolean) => void;
  onPortrait: (url: string) => void;
}

/**
 * Whichever section is on screen. Crossfaded rather than slid: the four are
 * peers, and sliding would imply a depth that is not there.
 */
export function CharacterSettingsBody({
  section,
  characterId,
  serverHost,
  draft,
  author,
  isPublic,
  isMine,
  portrait,
  onChange,
  onPublish,
  onPortrait,
}: CharacterSettingsBodyProps) {
  const reduced = useReducedMotion();
  const spec = SECTIONS[section];

  return (
    <Animated.View
      key={section}
      entering={reduced ? undefined : FadeIn.duration(UI_MS.disclosure)}
      exiting={reduced ? undefined : FadeOut.duration(UI_MS.revealReduced)}
    >
      {spec.fields.length > 0 ? (
        <CharacterFields
          keys={spec.fields}
          draft={draft}
          characterId={characterId}
          author={author}
          onChange={onChange}
        />
      ) : null}

      {section === "identity" ? (
        <View className="mt-6 gap-4 border-border border-t pt-6">
          <PortraitStudio
            characterId={characterId}
            serverHost={serverHost}
            avatarUrl={portrait}
            onPortrait={onPortrait}
          />
        </View>
      ) : null}

      {section === "voice" ? (
        <VoicePicker
          serverHost={serverHost}
          value={draft.voice}
          onChange={(voice) => onChange({ voice })}
        />
      ) : null}

      {section === "sharing" ? (
        <CharacterSharingSection
          characterId={characterId}
          isPublic={isPublic}
          isMine={isMine}
          onPublish={onPublish}
        />
      ) : null}
    </Animated.View>
  );
}
