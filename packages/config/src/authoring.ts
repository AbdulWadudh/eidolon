export type AuthorField =
  | "name"
  | "tagline"
  | "personality"
  | "scenario"
  | "rules"
  | "exampleDialogue"
  | "greeting"
  | "systemPrompt"
  | "chapter"
  | "lore"
  | "reply";

export type AuthorMode = "suggest" | "enhance";

export interface AuthorFieldSpec {
  label: string;
  guidance: string;
  maxTokens: number;
  maxChars: number;
  singleLine: boolean;
}

export const AUTHOR_FIELDS: Record<AuthorField, AuthorFieldSpec> = {
  name: {
    label: "Name",
    guidance:
      "A given name, sometimes with a surname. One or two words. Never a title, a description or a nickname in quotes.",
    maxTokens: 12,
    maxChars: 48,
    singleLine: true,
  },
  tagline: {
    label: "Tagline",
    guidance:
      "One short line about them, under ten words, written about them rather than by them. No full stop needed.",
    maxTokens: 28,
    maxChars: 90,
    singleLine: true,
  },
  personality: {
    label: "Personality",
    guidance:
      "Two or three sentences of prose about how they think and behave, in the third person. Concrete habits and reactions, not a list of adjectives.",
    maxTokens: 200,
    maxChars: 700,
    singleLine: false,
  },
  scenario: {
    label: "Scenario",
    guidance:
      "Two or three sentences saying where the two of you are and how you know each other. Address the reader as you.",
    maxTokens: 160,
    maxChars: 500,
    singleLine: false,
  },
  rules: {
    label: "Rules",
    guidance:
      "Short standing rules, one per line, of what they always or never do. No prose, no numbering.",
    maxTokens: 140,
    maxChars: 400,
    singleLine: false,
  },
  exampleDialogue: {
    label: "Example dialogue",
    guidance:
      "Two or three short exchanges showing how they talk. Every line begins with either You: or their name and a colon. Actions go in *asterisks*.",
    maxTokens: 240,
    maxChars: 800,
    singleLine: false,
  },
  greeting: {
    label: "Greeting",
    guidance:
      "One or two sentences they say first, in their own voice and the first person. It may open with one short *action*.",
    maxTokens: 90,
    maxChars: 300,
    singleLine: false,
  },
  systemPrompt: {
    label: "System prompt",
    guidance:
      "Standing instructions to the model in the imperative, addressed to them. Two or three short sentences at most.",
    maxTokens: 140,
    maxChars: 400,
    singleLine: false,
  },
  chapter: {
    label: "Chapter",
    guidance:
      "Two to four short lines, one per beat, of what happened between the two of you. Past tense, third person, one line each. No preamble and no numbering.",
    maxTokens: 160,
    maxChars: 500,
    singleLine: false,
  },
  reply: {
    label: "Reply",
    guidance:
      "One or two short sentences in their own voice, first person, the way a real person texts. It may open with one short *action*.",
    maxTokens: 90,
    maxChars: 300,
    singleLine: false,
  },
  lore: {
    label: "Lore entry",
    guidance:
      "One or two sentences of a single fact about them or their world, written as something they know. Concrete and specific, never a summary of their personality.",
    maxTokens: 110,
    maxChars: 320,
    singleLine: false,
  },
};

export const AUTHORING = {
  maxContextChars: 900,
  maxDraftChars: 1200,
  suggestTemperatures: [0.8, 1.0, 1.15],
  enhanceTemperatures: [0.35, 0.6, 0.9],
  enhanceGrowthRatio: 3,
  enhanceGrowthFloorChars: 220,
  contextLabel: "The character so far:",
  draftLabel: "Current:",
  writeLabel: "Write the",
  fields: AUTHOR_FIELDS,
} as const;

export const PROMPT_AUTHORING = {
  maxTokens: 900,
  maxChars: 6000,
  maxDraftChars: 6000,
  suggestTemperatures: [0.7, 0.95],
  enhanceTemperatures: [0.3, 0.6],
  descriptionLabel: "What this prompt is for:",
  variablesLabel: "Placeholders that must appear, spelled exactly like this:",
  noVariables: "This prompt takes no placeholders.",
  draftLabel: "Current prompt:",
  writeLabel: "Write the prompt:",
} as const;

export const AUTHOR_FIELD_KEYS = Object.keys(AUTHOR_FIELDS) as AuthorField[];

export function isAuthorField(value: unknown): value is AuthorField {
  return typeof value === "string" && value in AUTHOR_FIELDS;
}

export function isAuthorMode(value: unknown): value is AuthorMode {
  return value === "suggest" || value === "enhance";
}
