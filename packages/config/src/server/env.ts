import { networkInterfaces } from "node:os";
import { SERVER_DEFAULTS, STORAGE } from "../defaults";

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
  searxngUrl: string;
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

export function getPairingSecret(): string {
  return process.env.PAIRING_SECRET ?? "";
}

export function hasPairingSecret(): boolean {
  return getPairingSecret().trim().length > 0;
}

export function getAuthBaseUrl(): string {
  const { port } = getServerConfig();
  return process.env.BETTER_AUTH_URL || `http://${getLocalIp()}:${port}`;
}

export function getTrustedOrigins(): string[] {
  const { port } = getServerConfig();
  return [`http://localhost:${port}`, `http://127.0.0.1:${port}`, `http://${getLocalIp()}:${port}`];
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
    searxngUrl: process.env.SEARXNG_URL ?? "",
  };
}

export function getMockBackdropUrl(): string {
  return process.env.MOCK_BACKDROP_URL ?? "";
}

export function isTestEnv(): boolean {
  return process.env.NODE_ENV === "test";
}
