export const WORKING_CONTEXT = {
  windowSize: 20,
} as const;

export const RECALL = {
  // One, not two. A mean-pooled chat model separates a true match from an
  // unrelated one by about 0.02, so the runner-up is noise rather than a second
  // memory: on "what was your mum's name" it returned the mother 0.531 and an
  // unrelated job 0.510. A purpose-built embedder earns the second slot back.
  limit: 1,
  // Cosine similarity, not the reciprocal of an L2 distance. On normalised
  // vectors the old score topped out near 0.59, so a 0.65 gate could never open
  // and recall was silent whatever the embedder returned.
  //
  // Calibrated against a mean-pooled chat model, whose similarities all crowd
  // into 0.42-0.55: a true match measured 0.53 and an unrelated one 0.43. A
  // purpose-built embedder separates those far more widely and wants this back
  // near 0.65 - see stack/start-embed.bat.
  relevanceThreshold: 0.5,
  header: "[Memories Recalled from Past Conversations]",
  maxSnippetChars: 220,
  // Recall sits in front of the reply, so it gets a budget rather than the
  // general client timeout. A slow embedder costs a memory, not a slow answer.
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
  // A word this long that never appears in the results means the results are
  // about something else. Shorter words match too loosely to judge on.
  distinctiveMinLength: 7,
  commonQueryWords: [
    // Generic nouns a page answers without ever using: a forecast reports
    // "18C, light rain" and never says the word "weather".
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
  maxChars: 12000,
  charsPerToken: 4,
  sectionOrder: ["persona", "state", "chronicle", "recall", "lore", "web", "directive"],
} as const;

export type PromptSection = (typeof PROMPT_BUDGET.sectionOrder)[number];
