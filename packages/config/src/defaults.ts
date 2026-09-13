export const SERVER_DEFAULTS = {
  port: 3000,
  host: "0.0.0.0",
} as const;

export const TIMEOUTS_MS = {
  serviceHealth: 2000,
  imageGeneration: 3000,
  search: 4000,
  clientRequest: 6000,
  transcript: 20000,
  generation: 120000,
} as const;

export const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000] as const;

export const SOCKET = {
  heartbeatIntervalMs: 30000,
  reVerifyAfterAttempts: 2,
} as const;

export const CHAT = {
  suggestionCount: 3,
  waveformBars: 4,
  drawDistancePx: 1400,
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
  imageSweepWidthRatio: 1.15,
  imageSheenOpacity: 0.26,
  imageGlowOpacity: 0.14,
  focusScrollDelayMs: 250,
  focusScrollAttempts: 6,
  focusSettleMs: 700,
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
  imageSweep: 3400,
  imageGlow: 5200,
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
  temperature: 0.2,
  retryTemperature: 0.75,
  maxTokens: 180,
  draftLabel: "Sentence:",
  rewriteLabel: "Rewrite:",
  actionChance: 0.45,
} as const;

export const TRANSCRIPT = {
  pageSize: 120,
} as const;

export const CHAT_TURN = {
  historyTurns: 14,
  maxTokens: 140,
  photoNoteStops: ["[photo", "[Photo"],

  readerTurnStops: ["\nPLAYER:", "\nPlayer:", "\nplayer:", "\nUSER:", "\nUser:"],
  maxReplySentences: 3,
  maxReplyChars: 240,
  stopOnBlankLine: true,
} as const;

export const OUTPUT_TAGS = {
  speechOpen: "<speech>",
  speechClose: "</speech>",
  visualOpen: "<visual_prompt>",
  visualClose: "</visual_prompt>",
} as const;

export const TTS = {
  voice: "af_heart",
  format: "mp3",
  speed: 1.0,
  maxChars: 600,
  timeoutMs: 20000,
} as const;

export const USER_ROLES = ["owner", "member"] as const;

export type UserRole = (typeof USER_ROLES)[number];

export const AUTH = {
  minPasswordLength: 8,
  sessionExpirySeconds: 60 * 60 * 24 * 30,
  sessionRefreshSeconds: 60 * 60 * 24,
  roleField: "role",
  ownerRole: "owner",
  memberRole: "member",
  defaultRole: "member",
} as const;

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && USER_ROLES.some((role) => role === value);
}

export function roleOrDefault(value: unknown): UserRole {
  return isUserRole(value) ? value : AUTH.defaultRole;
}

export const AUDIT = {
  retain: 2000,
  pageSize: 100,
  maxDetailChars: 500,
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
  echoWords: 6,
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
  embeddingDimensions: 384,
  dimensionsFile: "dimensions.json",
  searchLimit: 5,
  tableName: "character_memories",
} as const;

export const SEARCH = {
  resultLimit: 3,
  cacheTtlMs: 60 * 60 * 1000,
} as const;

export const IMAGE_ENCODE = {
  format: "webp",
  extension: ".webp",
  quality: 90,
  effort: 5,
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

export const STORAGE_SWEEP = {
  intervalMs: 6 * 60 * 60 * 1000,
  graceMs: 60 * 60 * 1000,
  startupDelayMs: 60 * 1000,
  pageSize: 1000,
  sources: [
    { table: "characters", columns: ["avatar_url", "face_url", "background_url"] },
    { table: "messages", columns: ["audio_url", "image_url"] },
    { table: "character_portraits", columns: ["url"] },
    { table: "stages", columns: ["backdrop_url"] },
    { table: "user", columns: ["image"] },
  ],
} as const;

export const MEDIA_TYPES = {
  imageExtensions: [".webp", ".png", ".jpg", ".jpeg", ".gif", ".avif"],
  audioExtensions: [".mp3", ".m4a", ".wav", ".ogg", ".aac", ".opus"],
} as const;

export const MEDIA_KINDS = ["image", "audio", "other"] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

export const STORAGE_BROWSER = {
  pageSize: 25,
  maxPageSize: 200,
} as const;

export const DATA_FILES = {
  sqlite: "eidolon.db",
  lancedb: "lancedb",
  directoryName: "eidolon",
} as const;

export const PRONOUN_SETS = {
  she: {
    subject: "she",
    object: "her",
    possessive: "her",
    label: "She / her",
    s: "s",
    es: "es",
    has: "has",
    is: "is",
    was: "was",
  },
  he: {
    subject: "he",
    object: "him",
    possessive: "his",
    label: "He / him",
    s: "s",
    es: "es",
    has: "has",
    is: "is",
    was: "was",
  },
  they: {
    subject: "they",
    object: "them",
    possessive: "their",
    label: "They / them",
    s: "",
    es: "",
    has: "have",
    is: "are",
    was: "were",
  },
} as const;

export type PronounKey = keyof typeof PRONOUN_SETS;

export const DEFAULT_PRONOUNS: PronounKey = "they";

export function pronounsFor(key: string | null | undefined): (typeof PRONOUN_SETS)[PronounKey] {
  const wanted = (key ?? "").trim().toLowerCase();
  return wanted in PRONOUN_SETS
    ? PRONOUN_SETS[wanted as PronounKey]
    : PRONOUN_SETS[DEFAULT_PRONOUNS];
}

export function isPronounKey(key: string | null | undefined): key is PronounKey {
  return (key ?? "").trim().toLowerCase() in PRONOUN_SETS;
}

export const REPLY_VARIANTS = {
  count: 3,
} as const;
