import { View } from "react-native";
import {
  CharacterFields,
  type Draft,
  type FieldKey,
} from "@/components/characters/CharacterFields";
import { VoicePicker } from "@/components/ui/voice-picker";
import { useFieldAuthor } from "@/hooks/use-field-author";

export { EMPTY_DRAFT } from "@/components/characters/CharacterFields";
export type { Draft };

const ALL_FIELDS: FieldKey[] = [
  "name",
  "tagline",
  "personality",
  "scenario",
  "rules",
  "exampleDialogue",
  "greeting",
  "likes",
  "dislikes",
  "systemPrompt",
];

export interface CharacterFormProps {
  draft: Draft;
  serverHost: string;
  characterId?: string;
  compact?: boolean;
  onChange: (patch: Partial<Draft>) => void;
}

export function CharacterForm({
  draft,
  serverHost,
  characterId,
  compact = false,
  onChange,
}: CharacterFormProps) {
  const author = useFieldAuthor(serverHost, draft, onChange, { characterId });

  return (
    <View className={compact ? "gap-3" : "gap-5"}>
      <CharacterFields
        keys={ALL_FIELDS}
        draft={draft}
        characterId={characterId}
        author={author}
        compact={compact}
        onChange={onChange}
      />

      <View className="h-px bg-border" />

      <VoicePicker
        characterId={characterId}
        serverHost={serverHost}
        value={draft.voice}
        onChange={(voice) => onChange({ voice })}
      />
    </View>
  );
}
