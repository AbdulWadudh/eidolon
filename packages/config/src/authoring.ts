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
      "One or two words: a given name, sometimes with a surname. Never a title, never a description, never a nickname in quotes.",
    maxTokens: 12,
    maxChars: 48,
    visual: false,
    singleLine: true,
  },
  outfit: {
    label: "Outfit",
    guidance:
      "One phrase under twelve words, no verb and no full stop. Name the garment and one detail of it: the colour, the fabric, or how it sits. Clothes only: never the face, the hair, the build or the room.",
    maxTokens: 28,
    maxChars: 90,
    visual: true,
    singleLine: true,
  },
  place: {
    label: "Place",
    guidance:
      "One phrase under fifteen words, no verb and no full stop. Name the place, then one thing about the hour or the light. The place only, with nobody in it.",
    maxTokens: 32,
    maxChars: 110,
    visual: true,
    singleLine: true,
  },
  photo: {
    label: "Photo",
    guidance:
      "One phrase under twelve words naming one thing a camera is pointed at. Never a sentence, never spoken aloud, never a mention of cameras, phones or the person asking.",
    maxTokens: 28,
    maxChars: 90,
    visual: true,
    singleLine: true,
  },
  photoEdit: {
    label: "Photo change",
    guidance:
      "One instruction under twelve words for altering a picture that already exists: the light, the framing, the pose, the clothes, something added or taken out. Describe the change only, never the whole picture again.",
    maxTokens: 28,
    maxChars: 90,
    visual: true,
    singleLine: true,
  },
  portrait: {
    label: "Portrait",
    guidance:
      "One phrase under fifteen words of visual direction: where they stand and what the light is doing. Never the face, hair or build, which are already fixed.",
    maxTokens: 32,
    maxChars: 110,
    visual: true,
    singleLine: true,
  },
  tagline: {
    label: "Tagline",
    guidance:
      "One line under ten words, written about them rather than by them. No full stop needed. Name one true thing, not two.",
    maxTokens: 28,
    maxChars: 90,
    visual: false,
    singleLine: true,
  },
  personality: {
    label: "Personality",
    guidance:
      "Two or three sentences of prose in the third person, present tense. Give concrete habits and reactions: what they do when they are angry, bored or caught out. Never a list of adjectives and never a simile.",
    maxTokens: 200,
    maxChars: 700,
    visual: false,
    singleLine: false,
  },
  scenario: {
    label: "Scenario",
    guidance:
      "Two or three sentences saying where the two of you are and how you know each other. Address the user as you, in the present tense. Set the situation, never the plot.",
    maxTokens: 160,
    maxChars: 500,
    visual: false,
    singleLine: false,
  },
  rules: {
    label: "Rules",
    guidance:
      "Short standing rules, one per line, each starting with Always or Never and ending in a full stop. No prose, no numbering, no repeated lines.",
    maxTokens: 140,
    maxChars: 400,
    visual: false,
    singleLine: false,
  },
  exampleDialogue: {
    label: "Example dialogue",
    guidance:
      "Two or three short exchanges showing how they talk. Every line begins with You: or their name and a colon. Keep their lines under twenty words and let them sound unfinished, the way speech does. Actions go in *asterisks*. Never narrate between the lines.",
    maxTokens: 240,
    maxChars: 800,
    visual: false,
    singleLine: false,
  },
  greeting: {
    label: "Greeting",
    guidance:
      "One or two sentences they say to the user first, in their own voice, first person, present tense. It may open with one short *action*. Speak to the user directly and never to anybody else.",
    maxTokens: 90,
    maxChars: 300,
    visual: false,
    singleLine: false,
  },
  systemPrompt: {
    label: "System prompt",
    guidance:
      "Two or three short imperative sentences addressed to them, one instruction each. Say what to do, not what to avoid. Never describe the character, which the other fields already do.",
    maxTokens: 140,
    maxChars: 400,
    visual: false,
    singleLine: false,
  },
  chapter: {
    label: "Chapter",
    guidance:
      "Two to four lines, one beat each, of what happened between the two of you. Past tense, third person, no preamble and no numbering. Both of you appear in it.",
    maxTokens: 160,
    maxChars: 500,
    visual: false,
    singleLine: false,
  },
  reply: {
    label: "Reply",
    guidance:
      "One or two short sentences in their own voice, first person, present tense, the way a real person texts. Under twenty words. It may open with one short *action*. Never explain and never summarise what was just said.",
    maxTokens: 90,
    maxChars: 300,
    visual: false,
    singleLine: false,
  },
  likes: {
    label: "Likes",
    guidance:
      "Six or seven things they are drawn to, comma separated, no full stop. Name particular things rather than categories: a food, a kind of weather, a place, a habit in other people. Never a sentence.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  dislikes: {
    label: "Dislikes",
    guidance:
      "Six or seven things that put them off, comma separated, no full stop. Habits, noises, foods, kinds of talk. Never a sentence, and never the opposite of something in their likes.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaName: {
    label: "Your name",
    guidance:
      "One or two words: the name you want characters to call you, a given name or a handle. Never a title and never a description.",
    maxTokens: 12,
    maxChars: 48,
    singleLine: true,
    visual: false,
  },
  personaBio: {
    label: "Your bio",
    guidance:
      "Two or three sentences in the first person, present tense: what you do, where you are, what your days look like. Plain and concrete, the way you would tell someone you had just met. Never a mission statement.",
    maxTokens: 160,
    maxChars: 500,
    singleLine: false,
    visual: false,
  },
  personaHobbies: {
    label: "Your hobbies",
    guidance:
      "Five or six things you do with your own time, comma separated, no full stop. Name the instrument, the sport, the game, the kind of book, not the category. Never a sentence.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaLikes: {
    label: "What you like",
    guidance:
      "Six or seven things you are drawn to, comma separated, no full stop, written about yourself. Particular things rather than categories. Never a sentence.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaDislikes: {
    label: "What you dislike",
    guidance:
      "Six or seven things that put you off, comma separated, no full stop, written about yourself. Habits, noises, foods, kinds of talk. Never a sentence, and never the opposite of something you like.",
    maxTokens: 60,
    maxChars: 200,
    singleLine: true,
    visual: false,
  },
  personaPersonality: {
    label: "Your personality",
    guidance:
      "Two or three sentences in the first person, present tense, about how you behave rather than how you would like to be seen. What you do in a conversation, what you do when something goes wrong. Never a list of adjectives.",
    maxTokens: 200,
    maxChars: 700,
    singleLine: false,
    visual: false,
  },
  personaChapter: {
    label: "A chapter of your life",
    guidance:
      "A few sentences about one stretch of your life, first person, past tense: where you were, what you were doing, what was different by the end of it. One stretch only, never a summary of everything.",
    maxTokens: 200,
    maxChars: 700,
    singleLine: false,
    visual: false,
  },
  lore: {
    label: "Lore entry",
    guidance:
      "One or two sentences stating a single fact about them or their world, written as something they know. Name a thing, a place or an event, not a feeling. Never a summary of their personality and never a metaphor.",
    maxTokens: 110,
    maxChars: 320,
    visual: false,
    singleLine: true,
  },
};

export const AUTHORING = {
  maxContextChars: 900,
  maxDraftChars: 1200,
  suggestTemperatures: [0.8, 1.0, 1.15],
  enhanceTemperatures: [0.35, 0.6, 0.9],
  enhanceGrowthRatio: 3,
  enhanceGrowthFloorChars: 220,
  enhanceGrowthFieldShare: 0.6,
  contextLabel: "The character so far:",
  userContextLabel: "What they have written about themselves so far:",
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
