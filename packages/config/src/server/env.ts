import { networkInterfaces } from "node:os";
import { CACHE, SERVER_DEFAULTS, STORAGE } from "../defaults";
import { DEFAULT_IMAGE_PRESET, type ImagePresetKey, isImagePresetKey } from "../image";
import { DEFAULT_LLM_PROFILE, isLlmProfileKey, type LlmProfileKey } from "../llm";

export interface ServerConfig {
  port: number;
  host: string;
}

export interface StorageConfig {
  endpoint: string;
  region: string;
  bucket: string;
  publicUrl: string;
  forcePathStyle: boolean;
  accessKeyId: string;
  secretAccessKey: string;
}

export interface ServicesConfig {
  llmApiUrl: string;
  llmModel: string;
  comfyUiUrl: string;
  ttsApiUrl: string;
  sttApiUrl: string;
  embeddingsApiUrl: string;
  embeddingsModel: string;
}

export function getServerConfig(): ServerConfig {
  return {
    port: Number(process.env.PORT) || SERVER_DEFAULTS.port,
    host: process.env.HOST || SERVER_DEFAULTS.host,
  };
}

export function getLocalIp(): string {
  for (const addresses of Object.values(networkInterfaces())) {
    for (const address of addresses ?? []) {
      if (address.family === "IPv4" && !address.internal) {
        return address.address;
      }
    }
  }
  return "127.0.0.1";
}

export function getAuthSecret(): string {
  return process.env.BETTER_AUTH_SECRET || process.env.PAIRING_SECRET || "";
}

export function getPublicUrl(): string {
  return (process.env.PUBLIC_URL ?? "").trim().replace(/\/+$/, "");
}

export function getServerAddress(): string {
  const publicUrl = getPublicUrl();
  if (publicUrl) return publicUrl;
  const { port } = getServerConfig();
  return `${getLocalIp()}:${port}`;
}

export function getAuthBaseUrl(): string {
  const { port } = getServerConfig();
  return process.env.BETTER_AUTH_URL || `http://${getLocalIp()}:${port}`;
}

export function getTrustedOrigins(): string[] {
  const { port } = getServerConfig();
  const publicUrl = getPublicUrl();
  const origins = [
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
    `http://${getLocalIp()}:${port}`,
  ];
  return publicUrl ? [...origins, publicUrl] : origins;
}

export function getCacheUrl(): string {
  return process.env.REDIS_URL || CACHE.defaultUrl;
}

export function getStorageConfig(): StorageConfig {
  const endpoint = process.env.S3_ENDPOINT ?? "";
  const bucket = process.env.S3_BUCKET ?? "";
  const derivedPublicUrl = endpoint && bucket ? `${endpoint}/${bucket}` : "";

  return {
    endpoint,
    bucket,
    region: process.env.S3_REGION || STORAGE.defaultRegion,
    publicUrl: process.env.S3_PUBLIC_URL || derivedPublicUrl,
    forcePathStyle: process.env.S3_FORCE_PATH_STYLE === "true",
    accessKeyId: process.env.S3_ACCESS_KEY ?? "",
    secretAccessKey: process.env.S3_SECRET_KEY ?? "",
  };
}

export function missingStorageConfig(): string[] {
  return STORAGE.requiredEnv.filter((name) => !process.env[name]);
}

export function getServicesConfig(): ServicesConfig {
  return {
    llmApiUrl: process.env.LLM_API_URL ?? "",
    llmModel: process.env.LLM_MODEL ?? "",
    comfyUiUrl: process.env.COMFYUI_URL ?? "",
    ttsApiUrl: process.env.TTS_API_URL ?? "",
    sttApiUrl: process.env.STT_API_URL ?? "",
    embeddingsApiUrl: process.env.EMBEDDINGS_API_URL ?? process.env.LLM_API_URL ?? "",
    embeddingsModel: process.env.EMBEDDINGS_MODEL ?? "",
  };
}

export function getImagePreset(): ImagePresetKey {
  const name = (process.env.IMAGE_PRESET ?? "").trim();
  if (name.length === 0) return DEFAULT_IMAGE_PRESET;
  if (isImagePresetKey(name)) return name;

  console.warn(
    `[image] IMAGE_PRESET="${name}" is not a stack this knows. Falling back to ${DEFAULT_IMAGE_PRESET}.`,
  );
  return DEFAULT_IMAGE_PRESET;
}

export function getLlmProfile(): LlmProfileKey {
  const name = (process.env.LLM_PROFILE ?? "").trim();
  if (name.length === 0) return DEFAULT_LLM_PROFILE;
  if (isLlmProfileKey(name)) return name;

  console.warn(
    `[llm] LLM_PROFILE="${name}" is not a model family this knows. Falling back to ${DEFAULT_LLM_PROFILE}.`,
  );
  return DEFAULT_LLM_PROFILE;
}

export function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}
