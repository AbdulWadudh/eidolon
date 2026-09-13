export const QUEUE_NAMES = {
  gpu: "eidolon-gpu",
  s3Upload: "eidolon-s3-upload",
  proactive: "eidolon-proactive",
} as const;

export type QueueKey = keyof typeof QUEUE_NAMES;

export const QUEUE_PREFIXES = {
  gpu: "{eidolon-gpu}",
  s3Upload: "{eidolon-s3-upload}",
  proactive: "{eidolon-proactive}",
} as const;

export const QUEUE_JOBS = {
  generateStageBackdrop: "generate-stage-backdrop",
  generatePortrait: "generate-portrait",
  generateChatPhoto: "generate-chat-photo",
  summarizeChronicle: "summarize-chronicle",
  uploadImage: "upload-image",
  uploadAudio: "upload-audio",
  proactiveMessage: "proactive-message",
} as const;

export const QUEUE_RETENTION = {
  removeOnComplete: 100,
  removeOnFail: 50,
} as const;

export const QUEUE_UPLOAD_RETRY = {
  attempts: 5,
  backoffType: "exponential",
  backoffDelayMs: 2000,
} as const;

export const QUEUE_PROACTIVE_RETRY = {
  attempts: 2,
  backoffType: "fixed",
  backoffDelayMs: 5000,
} as const;

export const QUEUE_LOCK = {
  durationMs: 30000,
  stalledIntervalMs: 30000,
  maxStalledCount: 2,
} as const;

export const QUEUE_CONCURRENCY = {
  gpu: 1,
  s3Upload: 4,
  proactive: 2,
} as const;

export const QUEUE_SHUTDOWN = {
  drainTimeoutMs: 10000,
} as const;

export const QUEUE_VIEW = {
  perState: 20,
  maxRetryAtOnce: 50,
  pollMs: 5000,
  maxFieldChars: 200,
  redactedKeys: ["base64", "secret", "token", "password", "key"],
} as const;

export const CHRONICLE = {
  batchSize: 30,
  bulletCount: 3,
  maxBulletChars: 160,
  temperature: 0.3,
  maxTokens: 260,
} as const;

export const PROACTIVE = {
  temperature: 0.95,
  maxTokens: 90,
  maxChars: 240,
  minDelayMs: 45 * 60 * 1000,
  maxDelayMs: 5 * 60 * 60 * 1000,
} as const;

export const PORTRAIT = {
  orientation: "portrait",
  framing: "head and shoulders portrait, looking at camera, soft even light, plain background",
} as const;

export const STAGE = {
  orientation: "landscape",
  promptSuffix: "empty establishing shot, nobody in frame, wide",
  maxNameChars: 60,
  defaultLightingTint: "#F08C00",
  defaultSoundscapeStems: [] as readonly string[],
  backdropFileExtension: "webp",
} as const;
