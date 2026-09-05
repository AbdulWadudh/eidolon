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
  minTouchTargetPx: 44,
  toolButtonPx: 32,
  toolIconPx: 20,
  toolGapPx: 4,
  sendButtonPx: 42,
} as const;

export const CHAT_MS = {
  tokenFade: 90,
  beadPulse: 900,
  waveformBar: 640,
  waveformStagger: 90,
  rerollSpin: 300,
  trayCollapse: 220,
  shimmer: 1200,
} as const;

export const SUGGESTIONS = {
  count: 3,
  autoGenerate: false,
  sceneTurns: 8,
  maxSentences: 2,
  maxChars: 140,
  temperature: 0.9,
  maxTokens: 220,
} as const;

export const TRANSCRIPT = {
  pageSize: 120,
} as const;

export const CHAT_TURN = {
  historyTurns: 14,
  maxTokens: 140,
  temperature: 0.85,
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
  promptsKey: "eidolon:prompts:v1",
  promptsTtlSeconds: 3600,
  connectTimeoutMs: 1500,
} as const;

export const PERSONA_GUARD = {
  primeChars: 90,
  lookaheadChars: 40,
  maxRetries: 1,
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
  embeddingDimensions: 384,
  searchLimit: 5,
  tableName: "character_memories",
} as const;

export const SEARCH = {
  resultLimit: 3,
  cacheTtlMs: 60 * 60 * 1000,
} as const;

export const STORAGE = {
  defaultRegion: "us-east-1",
  imagePrefix: "images/characters",
  audioPrefix: "audio",
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
