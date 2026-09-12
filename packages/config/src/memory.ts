export const WORKING_CONTEXT = {
  maxMessageChars: 1500,
} as const;

export const RECALL = {
  limit: 2,
  relevanceThreshold: 0.5,
  header: "[Memories Recalled from Past Conversations]",
  maxSnippetChars: 220,
  timeoutMs: 1500,
} as const;

export const CHRONICLE_CONTEXT = {
  activeChapters: 3,
  header: "[Chapters So Far]",
} as const;

export const LOREBOOK = {
  header: "[World & Character Lore]",
  maxEntriesPerTurn: 4,
  maxContentChars: 400,
  lockedLabel: "Locked Secret",
} as const;

export const WEB_CONTEXT = {
  header: "[Real-Time Web Reference Information]",
  searchingDetail: "Checking live web sources...",
  emptyHeader: "[No Reliable Web Result]",
  distinctiveMinLength: 7,
  commonQueryWords: [
    "weather",
    "forecast",
    "temperature",
    "tomorrow",
    "tonight",
    "yesterday",
    "currently",
    "current",
    "weekend",
    "morning",
    "afternoon",
    "evening",
    "recently",
    "actually",
    "happened",
    "happening",
    "champion",
    "champions",
    "championship",
    "winning",
    "results",
    "between",
    "against",
    "another",
    "something",
    "anything",
    "everything",
  ],
  temporalMarkers: [
    "weather",
    "latest news",
    "latest",
    "current",
    "currently",
    "right now",
    "today",
    "tonight",
    "tomorrow",
    "this week",
    "who won",
    "score",
    "search up",
    "search for",
    "look up",
    "news",
    "price of",
    "stock",
    "release date",
  ],
  yearPattern: "(19|20)\\d{2}",
} as const;

export const MIND_UPDATE = {
  marker: "[mind_update:",
  minDelta: -3,
  maxDelta: 3,
  moodMaxWords: 2,
  memoryMaxChars: 160,
  drainChars: 400,
  extraTokens: 60,
} as const;

export const PROMPT_BUDGET = {
  worstCharsPerToken: 1.33,
  charsPerToken: 4,
  sectionOrder: ["persona", "state", "chronicle", "recall", "lore", "web", "directive"],
} as const;

export type PromptSection = (typeof PROMPT_BUDGET.sectionOrder)[number];
