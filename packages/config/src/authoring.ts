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
  | "outfit"
  | "place"
  | "photo"
  | "photoEdit"
  | "portrait"
  | "reply";

export type AuthorMode = "suggest" | "enhance";

export interface AuthorFieldSpec {
  label: string;
  guidance: string;
  maxTokens: number;
  maxChars: number;
  singleLine: boolean;
  visual: boolean;
}

export const AUTHOR_FIELDS: Record<AuthorField, AuthorFieldSpec> = {
  name: {
    label: "Name",
    guidance:
      "A given name, sometimes with a surname. One or two words. Never a title, a description or a nickname in quotes.",
    maxTokens: 12,
    maxChars: 48,
    visual: false,
    singleLine: true,
  },
  outfit: {
    label: "Outfit",
    guidance:
      "What they are wearing, as a short phrase of visual detail: garments, fabric, colour, how it sits on them. Under twelve words, never a sentence. Only clothes — never their face, hair, build or the place they are in.",
    maxTokens: 28,
    maxChars: 90,
    visual: true,
    singleLine: true,
  },
  place: {
    label: "Place",
    guidance:
      "Where the conversation is happening, as a short phrase of visual detail: the room or street, the weather, the hour, what the light is doing. Under fifteen words, never a sentence. The place only — nobody is in it.",
    maxTokens: 32,
    maxChars: 110,
    visual: true,
    singleLine: true,
  },
  photo: {
    label: "Photo",
    guidance:
      "What is in the frame, as a short phrase a camera could be pointed at: a place, a thing being done, something nearby. Under twelve words, never a sentence and never spoken aloud. Never mentions cameras, phones or the person asking.",
    maxTokens: 28,
    maxChars: 90,
    visual: true,
    singleLine: true,
  },
  photoEdit: {
    label: "Photo change",
    guidance:
      "What to alter about a picture that already exists, as an instruction: the light, the framing, the pose, the clothes, something added or taken out of the frame. Under twelve words, never a sentence and never spoken aloud. Describes the change only, never the whole picture again.",
    maxTokens: 28,
    maxChars: 90,
    visual: true,
    singleLine: true,
  },
  portrait: {
    label: "Portrait",
    guidance:
      "Extra visual direction for a portrait: clothing, setting, mood, the light. A short phrase under fifteen words, never a sentence. Never describes their face, hair or build, which are already fixed.",
    maxTokens: 32,
    maxChars: 110,
    visual: true,
    singleLine: true,
  },
  tagline: {
    label: "Tagline",
    guidance:
      "One short line about them, under ten words, written about them rather than by them. No full stop needed.",
    maxTokens: 28,
    maxChars: 90,
    visual: false,
    singleLine: true,
  },
  personality: {
    label: "Personality",
    guidance:
      "Two or three sentences of prose about how they think and behave, in the third person. Concrete habits and reactions, not a list of adjectives.",
    maxTokens: 200,
    maxChars: 700,
    visual: false,
    singleLine: false,
  },
  scenario: {
    label: "Scenario",
    guidance:
      "Two or three sentences saying where the two of you are and how you know each other. Address the reader as you.",
    maxTokens: 160,
    maxChars: 500,
    visual: false,
    singleLine: false,
  },
  rules: {
    label: "Rules",
    guidance:
      "Short standing rules, one per line, of what they always or never do. No prose, no numbering.",
    maxTokens: 140,
    maxChars: 400,
    visual: false,
    singleLine: false,
  },
  exampleDialogue: {
    label: "Example dialogue",
    guidance:
      "Two or three short exchanges showing how they talk. Every line begins with either You: or their name and a colon. Actions go in *asterisks*.",
    maxTokens: 240,
    maxChars: 800,
    visual: false,
    singleLine: false,
  },
  greeting: {
    label: "Greeting",
    guidance:
      "One or two sentences they say first, in their own voice and the first person. It may open with one short *action*.",
    maxTokens: 90,
    maxChars: 300,
    visual: false,
    singleLine: false,
  },
  systemPrompt: {
    label: "System prompt",
    guidance:
      "Standing instructions to the model in the imperative, addressed to them. Two or three short sentences at most.",
    maxTokens: 140,
    maxChars: 400,
    visual: false,
    singleLine: false,
  },
  chapter: {
    label: "Chapter",
    guidance:
      "Two to four short lines, one per beat, of what happened between the two of you. Past tense, third person, one line each. No preamble and no numbering.",
    maxTokens: 160,
    maxChars: 500,
    visual: false,
    singleLine: false,
  },
  reply: {
    label: "Reply",
    guidance:
      "One or two short sentences in their own voice, first person, the way a real person texts. It may open with one short *action*.",
    maxTokens: 90,
    maxChars: 300,
    visual: false,
    singleLine: false,
  },
  lore: {
    label: "Lore entry",
    guidance:
      "One or two sentences of a single fact about them or their world, written as something they know. Concrete and specific, never a summary of their personality.",
    maxTokens: 110,
    maxChars: 320,
    visual: false,
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
