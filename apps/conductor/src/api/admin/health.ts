import { IMAGE_PRESETS, LLM_PROFILES } from "@eidolon/config";
import {
  getCacheUrl,
  getImagePreset,
  getLlmProfile,
  getServicesConfig,
  getStorageConfig,
  LANCEDB_DIR_PATH,
  SQLITE_DB_PATH,
} from "@eidolon/config/server";
import { Hono } from "hono";
import { buildHealthReport } from "@/api/v1";
import type { OwnerEnv } from "@/auth/guard";
import { KOKORO, MEMORY, TRANSCRIBE, TTS, VOICE } from "@/config";

export const adminHealth = new Hono<OwnerEnv>();

export interface ServiceDetail {
  endpoint: string;
  using: string;
  note: string;
}

export function serviceDetails(): Record<string, ServiceDetail> {
  const services = getServicesConfig();
  const preset = IMAGE_PRESETS[getImagePreset()];
  const profile = LLM_PROFILES[getLlmProfile()];
  const storage = getStorageConfig();

  return {
    sqlite: { endpoint: SQLITE_DB_PATH, using: "bun:sqlite", note: "" },
    lancedb: {
      endpoint: LANCEDB_DIR_PATH,
      using: services.embeddingsModel || services.embeddingsApiUrl,
      note: `${MEMORY.embeddingDimensions} dimensions · ${MEMORY.tableName}`,
    },
    llm: {
      endpoint: services.llmApiUrl,
      using: services.llmModel || profile.modelFile,
      note: `${getLlmProfile()} · ${profile.contextTokens} tokens`,
    },
    comfyui: {
      endpoint: services.comfyUiUrl,
      using: preset.checkpoint,
      note: `${getImagePreset()} · ${preset.widthPx}×${preset.heightPx} · ${preset.steps} steps`,
    },
    cache: { endpoint: getCacheUrl(), using: "redis", note: "" },
    tts: {
      endpoint: services.ttsApiUrl,
      using: `${KOKORO.model} · ${TTS.voice}`,
      note: `${VOICE.defaultId} by default`,
    },
    stt: {
      endpoint: services.sttApiUrl,
      using: TRANSCRIBE.model,
      note: services.sttApiUrl ? TRANSCRIBE.language : "no endpoint set",
    },
    storage: {
      endpoint: storage.endpoint,
      using: storage.bucket,
      note: storage.region,
    },
  };
}

adminHealth.get("/", async (c) =>
  c.json({ ...(await buildHealthReport()), details: serviceDetails() }),
);
