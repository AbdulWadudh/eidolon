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
  "systemPrompt",
];

export interface CharacterFormProps {
  draft: Draft;
  serverHost: string;
  onChange: (patch: Partial<Draft>) => void;
}

/**
 * The whole card at once, for writing a character from nothing. Editing an
 * existing one goes through the settings screen instead, which shows the same
 * fields a section at a time.
 */
export function CharacterForm({ draft, serverHost, onChange }: CharacterFormProps) {
  const author = useFieldAuthor(serverHost, draft, onChange);

  return (
    <View className="gap-5">
      <CharacterFields keys={ALL_FIELDS} draft={draft} author={author} onChange={onChange} />

      <View className="h-px bg-border" />

      <VoicePicker
        serverHost={serverHost}
        value={draft.voice}
        onChange={(voice) => onChange({ voice })}
      />
    </View>
  );
}
