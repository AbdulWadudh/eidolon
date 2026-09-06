import { CHARACTER_COPY, VOICE } from "@eidolon/config";
import type { CharacterCard } from "./character-api";

export type Draft = Omit<CharacterCard, "id" | "ownerId" | "isPublic" | "forkedFrom">;

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

/** Everything with a text field. `voice` is chosen from a list instead. */
export type FieldKey = Exclude<keyof Draft, "voice">;

export interface FieldSpec {
  key: FieldKey;
  label: string;
  hint: string;
  lines: number;
}

export const FIELDS: Record<FieldKey, FieldSpec> = {
  name: { key: "name", label: CHARACTER_COPY.nameLabel, hint: CHARACTER_COPY.nameHint, lines: 1 },
  tagline: {
    key: "tagline",
    label: CHARACTER_COPY.taglineLabel,
    hint: CHARACTER_COPY.taglineHint,
    lines: 1,
  },
  greeting: {
    key: "greeting",
    label: CHARACTER_COPY.greetingLabel,
    hint: CHARACTER_COPY.greetingHint,
    lines: 2,
  },
  personality: {
    key: "personality",
    label: CHARACTER_COPY.personalityLabel,
    hint: CHARACTER_COPY.personalityHint,
    lines: 4,
  },
  scenario: {
    key: "scenario",
    label: CHARACTER_COPY.scenarioLabel,
    hint: CHARACTER_COPY.scenarioHint,
    lines: 3,
  },
  rules: {
    key: "rules",
    label: CHARACTER_COPY.rulesLabel,
    hint: CHARACTER_COPY.rulesHint,
    lines: 3,
  },
  exampleDialogue: {
    key: "exampleDialogue",
    label: CHARACTER_COPY.examplesLabel,
    hint: CHARACTER_COPY.examplesHint,
    lines: 5,
  },
  systemPrompt: {
    key: "systemPrompt",
    label: CHARACTER_COPY.systemLabel,
    hint: CHARACTER_COPY.systemHint,
    lines: 3,
  },
};

export function changedKeys(draft: Draft, card: Draft | null): (keyof Draft)[] {
  if (!card) return [];
  return (Object.keys(EMPTY_DRAFT) as (keyof Draft)[]).filter((key) => draft[key] !== card[key]);
}
