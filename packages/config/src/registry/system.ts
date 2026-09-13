import {
  ADMIN_API_PREFIX,
  ADMIN_API_ROUTES,
  ADMIN_ROUTES,
  API_PREFIX,
  API_ROUTES,
  API_VERSION,
  AUTH_ROUTES,
  HEALTH_ALIAS_PATH,
  STATIC_ROUTES,
} from "../api";
import {
  QUEUE_CONCURRENCY,
  QUEUE_JOBS,
  QUEUE_LOCK,
  QUEUE_NAMES,
  QUEUE_PREFIXES,
  QUEUE_PROACTIVE_RETRY,
  QUEUE_RETENTION,
  QUEUE_SHUTDOWN,
  QUEUE_UPLOAD_RETRY,
  QUEUE_VIEW,
} from "../queue";
import { REASONS } from "./reasons";
import type { ConfigGroup } from "./types";

const ROUTE_GROUPS: ConfigGroup[] = [
  { name: "API_VERSION", value: API_VERSION },
  { name: "API_PREFIX", value: API_PREFIX },
  { name: "API_ROUTES", value: API_ROUTES },
  { name: "HEALTH_ALIAS_PATH", value: HEALTH_ALIAS_PATH },
  { name: "STATIC_ROUTES", value: STATIC_ROUTES },
  { name: "AUTH_ROUTES", value: AUTH_ROUTES },
  { name: "ADMIN_ROUTES", value: ADMIN_ROUTES },
  { name: "ADMIN_API_PREFIX", value: ADMIN_API_PREFIX },
  { name: "ADMIN_API_ROUTES", value: ADMIN_API_ROUTES },
].map((entry) => ({
  ...entry,
  source: "api.ts",
  bucket: "structural" as const,
  reason: REASONS.routeContract,
}));

const QUEUE_BOOT: ConfigGroup[] = [
  { name: "QUEUE_RETENTION", value: QUEUE_RETENTION },
  { name: "QUEUE_UPLOAD_RETRY", value: QUEUE_UPLOAD_RETRY },
  { name: "QUEUE_PROACTIVE_RETRY", value: QUEUE_PROACTIVE_RETRY },
  { name: "QUEUE_LOCK", value: QUEUE_LOCK },
  { name: "QUEUE_CONCURRENCY", value: QUEUE_CONCURRENCY },
  { name: "QUEUE_SHUTDOWN", value: QUEUE_SHUTDOWN },
].map((entry) => ({
  ...entry,
  source: "queue.ts",
  bucket: "boot-bound" as const,
  reason: REASONS.workerBoot,
}));

const QUEUE_KEYS: ConfigGroup[] = [
  { name: "QUEUE_NAMES", value: QUEUE_NAMES },
  { name: "QUEUE_PREFIXES", value: QUEUE_PREFIXES },
  { name: "QUEUE_JOBS", value: QUEUE_JOBS },
].map((entry) => ({
  ...entry,
  source: "queue.ts",
  bucket: "structural" as const,
  reason: REASONS.redisKey,
}));

const ENVIRONMENT: ConfigGroup = {
  name: "ENVIRONMENT",
  source: "server/env.ts",
  bucket: "deployment",
  reason: REASONS.envVar,
  value: {
    PORT: process.env.PORT ?? "",
    HOST: process.env.HOST ?? "",
    PUBLIC_URL: process.env.PUBLIC_URL ?? "",
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL ?? "",
    REDIS_URL: process.env.REDIS_URL ?? "",
    LLM_API_URL: process.env.LLM_API_URL ?? "",
    LLM_MODEL: process.env.LLM_MODEL ?? "",
    LLM_PROFILE: process.env.LLM_PROFILE ?? "",
    COMFYUI_URL: process.env.COMFYUI_URL ?? "",
    IMAGE_PRESET: process.env.IMAGE_PRESET ?? "",
    TTS_API_URL: process.env.TTS_API_URL ?? "",
    STT_API_URL: process.env.STT_API_URL ?? "",
    EMBEDDINGS_API_URL: process.env.EMBEDDINGS_API_URL ?? "",
    EMBEDDINGS_MODEL: process.env.EMBEDDINGS_MODEL ?? "",
    S3_ENDPOINT: process.env.S3_ENDPOINT ?? "",
    S3_BUCKET: process.env.S3_BUCKET ?? "",
    S3_REGION: process.env.S3_REGION ?? "",
    S3_PUBLIC_URL: process.env.S3_PUBLIC_URL ?? "",
    S3_FORCE_PATH_STYLE: process.env.S3_FORCE_PATH_STYLE ?? "",
    MOCK_BACKDROP_URL: process.env.MOCK_BACKDROP_URL ?? "",
    EIDOLON_DATA_DIR: process.env.EIDOLON_DATA_DIR ?? "",
    EIDOLON_PUBLIC_DIR: process.env.EIDOLON_PUBLIC_DIR ?? "",
    NODE_ENV: process.env.NODE_ENV ?? "",
  },
};

const SECRETS: ConfigGroup = {
  name: "SECRETS",
  source: "server/env.ts",
  bucket: "deployment",
  secret: true,
  reason: REASONS.secret,
  value: {
    S3_ACCESS_KEY: Boolean(process.env.S3_ACCESS_KEY),
    S3_SECRET_KEY: Boolean(process.env.S3_SECRET_KEY),
    SERPER_API_KEY: Boolean(process.env.SERPER_API_KEY),
    EXA_API_KEY: Boolean(process.env.EXA_API_KEY),
  },
};

const QUEUE_READ: ConfigGroup = {
  name: "QUEUE_VIEW",
  source: "queue.ts",
  value: QUEUE_VIEW,
  bucket: "editable",
  reason: REASONS.requestRead,
};

export const SYSTEM_GROUPS: ConfigGroup[] = [
  QUEUE_READ,
  ...ROUTE_GROUPS,
  ...QUEUE_KEYS,
  ...QUEUE_BOOT,
  ENVIRONMENT,
  SECRETS,
];
