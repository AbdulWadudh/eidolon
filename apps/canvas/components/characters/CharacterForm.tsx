import { CHARACTER_COPY, CHAT, VOICE } from "@eidolon/config";
import { Text, TextInput, View } from "react-native";
import { VoicePicker } from "@/components/ui/voice-picker";
import type { CharacterCard } from "@/store/character-api";
import { useResolvedTheme } from "@/store/theme-store";

export type Draft = Omit<CharacterCard, "id">;

export const EMPTY_DRAFT: Draft = {
  name: "",
  tagline: "",
  personality: "",
  systemPrompt: "",
  scenario: "",
  rules: "",
  exampleDialogue: "",
  greeting: "",
  voice: VOICE.defaultId,
};

interface FieldSpec {
  key: keyof Draft;
  label: string;
  hint: string;
  lines: number;
}

const FIELDS: FieldSpec[] = [
  { key: "name", label: CHARACTER_COPY.nameLabel, hint: CHARACTER_COPY.nameHint, lines: 1 },
  {
    key: "tagline",
    label: CHARACTER_COPY.taglineLabel,
    hint: CHARACTER_COPY.taglineHint,
    lines: 1,
  },
  {
    key: "personality",
    label: CHARACTER_COPY.personalityLabel,
    hint: CHARACTER_COPY.personalityHint,
    lines: 4,
  },
  {
    key: "scenario",
    label: CHARACTER_COPY.scenarioLabel,
    hint: CHARACTER_COPY.scenarioHint,
    lines: 3,
  },
  { key: "rules", label: CHARACTER_COPY.rulesLabel, hint: CHARACTER_COPY.rulesHint, lines: 3 },
  {
    key: "exampleDialogue",
    label: CHARACTER_COPY.examplesLabel,
    hint: CHARACTER_COPY.examplesHint,
    lines: 5,
  },
  {
    key: "greeting",
    label: CHARACTER_COPY.greetingLabel,
    hint: CHARACTER_COPY.greetingHint,
    lines: 2,
  },
  {
    key: "systemPrompt",
    label: CHARACTER_COPY.systemLabel,
    hint: CHARACTER_COPY.systemHint,
    lines: 3,
  },
];

export interface CharacterFormProps {
  draft: Draft;
  serverHost: string;
  onChange: (patch: Partial<Draft>) => void;
}

export function CharacterForm({ draft, serverHost, onChange }: CharacterFormProps) {
  const theme = useResolvedTheme();

  return (
    <View className="gap-5">
      {FIELDS.map((field) => (
        <View className="gap-1.5" key={field.key}>
          <Text className="font-ui-medium text-sm text-text-primary">{field.label}</Text>
          <Text className="font-ui text-[11px] text-text-muted">{field.hint}</Text>
          <TextInput
            accessibilityLabel={field.label}
            value={draft[field.key]}
            onChangeText={(value) => onChange({ [field.key]: value } as Partial<Draft>)}
            multiline={field.lines > 1}
            placeholder={field.hint}
            placeholderTextColor={theme.textMuted}
            cursorColor={theme.primary}
            selectionColor={theme.primary}
            textAlignVertical={field.lines > 1 ? "top" : "center"}
            className="rounded-button border border-border bg-input px-3 py-2 font-main text-sm text-text-primary"
            style={{
              minHeight: Math.max(CHAT.minTouchTargetPx, field.lines * 22 + 16),
            }}
          />
        </View>
      ))}

      <View className="h-px bg-border" />

      <VoicePicker
        serverHost={serverHost}
        value={draft.voice}
        onChange={(voice) => onChange({ voice })}
      />
    </View>
  );
}
