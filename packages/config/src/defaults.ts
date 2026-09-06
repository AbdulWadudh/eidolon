export const SERVER_DEFAULTS = {
  port: 3000,
  host: "0.0.0.0",
} as const;

export const PAIRING = {
  uriScheme: "eidolon://pair",
} as const;

export const TIMEOUTS_MS = {
  serviceHealth: 2000,
  imageGeneration: 3000,
  search: 4000,
  clientRequest: 6000,
} as const;

export const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000] as const;

export const SOCKET = {
  heartbeatIntervalMs: 30000,
  reVerifyAfterAttempts: 2,
} as const;

export const CHAT = {
  suggestionCount: 3,
  waveformBars: 4,
  drawDistancePx: 480,
  liveEdgeThresholdPx: 96,
  autoscrollBottomThreshold: 0.2,
  scrollPreviousItemPeekPx: 56,
  audioPillWaveformHeightPx: 13,
  audioTabOverlapPx: 10,
  waveformBarWidthPx: 2,
  waveformBarRadiusPx: 1,
  beadWidthPx: 8,
  beadHeightPx: 16,
  beadRadiusPx: 2,
  shimmerBarHeightPx: 12,
  shimmerBarRadiusPx: 3,
  imageAspectRatio: 832 / 1216,
  imageSweepWidthRatio: 0.45,
  imageSheenOpacity: 0.22,
  minTouchTargetPx: 44,
  toolButtonPx: 32,
  toolIconPx: 20,
  toolGapPx: 4,
  sendButtonPx: 42,
} as const;

export const PHOTO = {
  minZoom: 1,
  maxZoom: 4,
  doubleTapZoom: 2.2,
  avatarFrameFraction: 0.72,
  cropDimOpacity: 0.3,
  backdropFadePercent: 34,
  backdropFadeOpacity: 0.96,
  backdropFadeMidOpacity: 0.55,
} as const;

export const CHAT_MS = {
  tokenFade: 90,
  beadPulse: 900,
  waveformBar: 640,
  waveformStagger: 90,
  rerollSpin: 300,
  trayCollapse: 220,
  shimmer: 1200,
  imageFade: 220,
  imageSweep: 1600,
} as const;

export const SUGGESTIONS = {
  count: 3,
  autoGenerate: false,
  sceneTurns: 8,
  maxSentences: 2,
  maxChars: 140,
  maxWithAction: 1,
  temperature: 0.9,
  maxTokens: 220,
} as const;

export const STAGE_DIRECTIONS = {
  maxWords: 5,
  maxPerReply: 1,
} as const;

export const ENHANCE = {
  maxInputChars: 600,
  maxOutputChars: 400,
  // Low, deliberately. At conversational temperatures the model stops rewriting
  // the draft and starts answering it.
  temperature: 0.2,
  // A second pass over an already-polished line comes back identical at a low
  // temperature. Reworking again is the whole point of the button, so the retry
  // is warmer rather than a refusal.
  retryTemperature: 0.75,
  maxTokens: 180,
  draftLabel: "Sentence:",
  rewriteLabel: "Rewrite:",
  // How often a rework also opens the line with a stage direction. Only ever
  // offered on a draft that has no action already and is not a question: asked
  // to add an action to a question, the model answers the question instead.
  actionChance: 0.45,
} as const;

export const TRANSCRIPT = {
  pageSize: 120,
} as const;

export const CHAT_TURN = {
  historyTurns: 14,
  maxTokens: 140,
  temperature: 0.85,
  presencePenalty: 0.6,
  frequencyPenalty: 0.4,
  photoNoteStops: ["[photo", "[Photo"],
  maxReplySentences: 3,
  maxReplyChars: 240,
  stopOnBlankLine: true,
} as const;

export const TTS = {
  voice: "af_heart",
  format: "mp3",
  speed: 1.0,
  maxChars: 600,
  timeoutMs: 20000,
} as const;

export const CACHE = {
  defaultUrl: "redis://127.0.0.1:6379",
  defaultPort: 6379,
  promptsKey: "eidolon:prompts:v1",
  promptsTtlSeconds: 3600,
  connectTimeoutMs: 1500,
} as const;

export const PERSONA_GUARD = {
  primeChars: 90,
  // How many opening words of an internal reminder count as the model having
  // repeated it back instead of following it.
  echoWords: 6,
  // Words that only exist inside this app's machinery. A character has no idea
  // what a stage direction is, so saying the phrase at all gives the game away
  // even when the reminder itself was not quoted.
  metaPhrases: [
    "stage direction",
    "system prompt",
    "the instruction",
    "what you wanted me to say instead",
  ],
  lookaheadChars: 40,
  maxRetries: 1,
  spokenFallbacks: [
    "Sorry, got distracted. What were you saying?",
    "Anyway. Tell me something.",
    "Ha. Okay, go on.",
    "Right, where were we?",
  ],
  deflections: [
    "*snorts* Wow. Real charmer, aren't you.",
    "*rolls eyes* Sure. And I'm secretly a lizard. Next question.",
    "*laughs* You're so weird. Ask me something real.",
    "*raises an eyebrow* That's your opening line? Try again.",
    "*shakes head, smiling* Not touching that one.",
    "*tilts head* Where is this going, exactly?",
  ],
} as const;

export const AFFINITY = {
  min: -100,
  max: 100,
  start: 0,
  maxDeltaPerTurn: 5,
  temperature: 0.3,
  maxTokens: 80,
  tiers: [
    { from: -100, name: "Hostile" },
    { from: -55, name: "Wary" },
    { from: -20, name: "Distant" },
    { from: 10, name: "Acquainted" },
    { from: 35, name: "Friendly" },
    { from: 60, name: "Close" },
    { from: 80, name: "Trusted Confidant" },
    { from: 93, name: "Devoted" },
  ],
  moods: [
    "Guarded",
    "Curious",
    "Playful",
    "Teasing",
    "Warm",
    "Affectionate",
    "Vulnerable",
    "Annoyed",
    "Hurt",
    "Thoughtful",
  ],
  defaultMood: "Curious",
  warmMoods: ["Playful", "Teasing", "Warm", "Affectionate", "Vulnerable"],
  coldMoods: ["Guarded", "Annoyed", "Hurt"],
} as const;

export const MEMORY = {
  // The fallback embedder's width. The real width is whatever the embedding
  // endpoint returns, discovered on the first call, and the table is rebuilt
  // when it changes.
  embeddingDimensions: 384,
  dimensionsFile: "dimensions.json",
  searchLimit: 5,
  tableName: "character_memories",
} as const;

export const SEARCH = {
  resultLimit: 3,
  cacheTtlMs: 60 * 60 * 1000,
} as const;

export const STORAGE = {
  defaultRegion: "us-east-1",
  characterPrefix: "characters",
  imageFolder: "images",
  audioFolder: "audio",
  imageContentType: "image/webp",
  audioContentType: "audio/mpeg",
  requiredEnv: ["S3_ENDPOINT", "S3_BUCKET", "S3_ACCESS_KEY", "S3_SECRET_KEY"],
} as const;

export const DATA_FILES = {
  sqlite: "eidolon.db",
  lancedb: "lancedb",
  directoryName: "eidolon",
} as const;

export const MOCK = {
  aspectRatio: "9:16",
} as const;

export const UI_MS = {
  themePersistDebounce: 120,
  pairingStatusPoll: 2000,
  copyFeedback: 1600,
  pressFeedback: 160,
  reveal: 400,
  revealStagger: 55,
  revealReduced: 200,
  disclosure: 220,
} as const;

export const EASING = {
  out: "cubic-bezier(0.23, 1, 0.32, 1)",
  inOut: "cubic-bezier(0.77, 0, 0.175, 1)",
} as const;

export const EASING_BEZIER = {
  out: [0.23, 1, 0.32, 1],
  inOut: [0.77, 0, 0.175, 1],
} as const;

export const PRESS_SCALE = 0.97;
