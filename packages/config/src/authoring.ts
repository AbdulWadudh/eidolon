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
  | "likes"
  | "dislikes"
  | "personaName"
  | "personaBio"
  | "personaHobbies"
  | "personaLikes"
  | "personaDislikes"
  | "personaPersonality"
  | "personaChapter"
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
  likes: {
    label: "Likes",
    guidance:
      "Things they are drawn to, as a short comma separated list: food, music, weather, places, the kind of person they warm to. Six or seven at most, concrete rather than abstract. Never a sentence.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  dislikes: {
    label: "Dislikes",
    guidance:
      "Things that put them off, as a short comma separated list: habits, noises, foods, kinds of talk. Six or seven at most, concrete rather than abstract. Never a sentence, and never the exact opposite of their likes.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaName: {
    label: "Your name",
    guidance:
      "The name you want characters to call you. One or two words, a given name or a handle. Never a title and never a description.",
    maxTokens: 12,
    maxChars: 48,
    singleLine: true,
    visual: false,
  },
  personaBio: {
    label: "Your bio",
    guidance:
      "Two or three sentences about who you are, in the first person: what you do, where you are, what your days look like. Concrete and plain, the way you would tell someone you had just met.",
    maxTokens: 160,
    maxChars: 500,
    singleLine: false,
    visual: false,
  },
  personaHobbies: {
    label: "Your hobbies",
    guidance:
      "What you do with your own time, as a short comma separated list. Five or six at most, specific rather than general: name the instrument, the sport, the game, the kind of book. Never a sentence.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaLikes: {
    label: "What you like",
    guidance:
      "Things you are drawn to, as a short comma separated list, written about yourself: food, music, weather, places, the kind of person you warm to. Six or seven at most, concrete. Never a sentence.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaDislikes: {
    label: "What you dislike",
    guidance:
      "Things that put you off, as a short comma separated list, written about yourself: habits, noises, foods, kinds of talk. Six or seven at most, concrete. Never a sentence, and never the exact opposite of what you like.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaPersonality: {
    label: "Your personality",
    guidance:
      "Two or three sentences about how you think and behave, in the first person. Concrete habits and reactions, how you are in a conversation, what you do when something goes wrong. Not a list of adjectives.",
    maxTokens: 200,
    maxChars: 700,
    singleLine: false,
    visual: false,
  },
  personaChapter: {
    label: "A chapter of your life",
    guidance:
      "A few sentences about one stretch of your life, in the first person and the past tense: where you were, what you were doing, what changed by the end of it. One chapter only, never a summary of everything.",
    maxTokens: 200,
    maxChars: 700,
    singleLine: false,
    visual: false,
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
  readerContextLabel: "What they have written about themselves so far:",
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
