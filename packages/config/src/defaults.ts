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

export const RECONNECT_DELAYS_MS = [1000, 2000, 5000, 10000, 30000] as const;

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
