import { DEFAULT_IMAGE_PRESET, IMAGE, IMAGE_PRESETS, PROMPT_STYLES } from "../image";
import {
  CARD_UPLOAD,
  KOKORO,
  MP3_SCAN,
  SENTENCE_BUFFER,
  SILENT_MP3,
  TRANSCRIBE,
} from "../live-voice";
import { DEFAULT_LLM_PROFILE, LLM_PROFILES } from "../llm";
import { PORTRAIT, STAGE } from "../queue";
import { VOICE, VOICE_GENDERS, VOICE_LANGUAGES } from "../voice";
import { REASONS } from "./reasons";
import type { ConfigGroup } from "./types";

export const MEDIA_GROUPS: ConfigGroup[] = [
  {
    name: "LLM_PROFILES",
    source: "llm.ts",
    value: LLM_PROFILES,
    bucket: "service-bound",
    boundTo: "the model loaded on LLM_API_URL",
    reason: REASONS.llmBound,
  },
  {
    name: "DEFAULT_LLM_PROFILE",
    source: "llm.ts",
    value: DEFAULT_LLM_PROFILE,
    bucket: "deployment",
    boundTo: "LLM_PROFILE",
    reason: REASONS.envVar,
  },
  {
    name: "IMAGE_PRESETS",
    source: "image.ts",
    value: IMAGE_PRESETS,
    bucket: "service-bound",
    boundTo: "ComfyUI",
    reason: REASONS.comfyBound,
  },
  {
    name: "DEFAULT_IMAGE_PRESET",
    source: "image.ts",
    value: DEFAULT_IMAGE_PRESET,
    bucket: "deployment",
    boundTo: "IMAGE_PRESET",
    reason: REASONS.envVar,
  },
  {
    name: "PROMPT_STYLES",
    source: "image.ts",
    value: PROMPT_STYLES,
    bucket: "structural",
    reason: "Keyed by a preset's promptStyle, so the key set is a type, not a setting.",
  },
  {
    name: "IMAGE",
    source: "image.ts",
    value: IMAGE,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "VOICE",
    source: "voice.ts",
    value: VOICE,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      defaultId: { bucket: "service-bound", boundTo: "Kokoro", reason: REASONS.kokoroBound },
    },
  },
  {
    name: "VOICE_LANGUAGES",
    source: "voice.ts",
    value: VOICE_LANGUAGES,
    bucket: "service-bound",
    boundTo: "Kokoro",
    reason: "Decodes the first letter of a Kokoro voice id. Kokoro chose the letters.",
  },
  {
    name: "VOICE_GENDERS",
    source: "voice.ts",
    value: VOICE_GENDERS,
    bucket: "service-bound",
    boundTo: "Kokoro",
    reason: "Decodes the second letter of a Kokoro voice id. Kokoro chose the letters.",
  },
  {
    name: "KOKORO",
    source: "live-voice.ts",
    value: KOKORO,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      model: { bucket: "service-bound", boundTo: "Kokoro", reason: REASONS.kokoroBound },
      speechPath: { bucket: "service-bound", boundTo: "Kokoro", reason: REASONS.kokoroBound },
      defaultVoice: { bucket: "service-bound", boundTo: "Kokoro", reason: REASONS.kokoroBound },
      responseFormat: { bucket: "service-bound", boundTo: "Kokoro", reason: REASONS.kokoroBound },
    },
  },
  {
    name: "TRANSCRIBE",
    source: "live-voice.ts",
    value: TRANSCRIBE,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      model: { bucket: "service-bound", boundTo: "STT_API_URL", reason: REASONS.whisperBound },
      path: { bucket: "service-bound", boundTo: "STT_API_URL", reason: REASONS.whisperBound },
      responseFormat: {
        bucket: "service-bound",
        boundTo: "STT_API_URL",
        reason: REASONS.whisperBound,
      },
      formField: { bucket: "service-bound", boundTo: "STT_API_URL", reason: REASONS.whisperBound },
      filename: { bucket: "service-bound", boundTo: "STT_API_URL", reason: REASONS.whisperBound },
    },
  },
  {
    name: "SENTENCE_BUFFER",
    source: "live-voice.ts",
    value: SENTENCE_BUFFER,
    bucket: "editable",
    reason: REASONS.requestRead,
  },
  {
    name: "SILENT_MP3",
    source: "live-voice.ts",
    value: SILENT_MP3,
    bucket: "structural",
    reason: "MP3 frame layout. A wrong number produces a file no decoder accepts.",
  },
  {
    name: "MP3_SCAN",
    source: "live-voice.ts",
    value: MP3_SCAN,
    bucket: "structural",
    reason: "ID3 marker bytes and header sizes, fixed by the MP3 container format.",
  },
  {
    name: "CARD_UPLOAD",
    source: "live-voice.ts",
    value: CARD_UPLOAD,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      fieldNames: { bucket: "structural", reason: REASONS.cardSpec },
      anchorFilename: { bucket: "structural", reason: REASONS.storedShape },
      anchorContentType: { bucket: "structural", reason: REASONS.storedShape },
      exportContentType: { bucket: "structural", reason: REASONS.cardSpec },
      chunkKeywords: { bucket: "structural", reason: REASONS.cardSpec },
      writeKeyword: { bucket: "structural", reason: REASONS.cardSpec },
    },
  },
  {
    name: "PORTRAIT",
    source: "queue.ts",
    value: PORTRAIT,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      orientation: {
        bucket: "structural",
        reason: "Picks which width and height the preset supplies. Only the two names exist.",
      },
    },
  },
  {
    name: "STAGE",
    source: "queue.ts",
    value: STAGE,
    bucket: "editable",
    reason: REASONS.requestRead,
    leaves: {
      orientation: {
        bucket: "structural",
        reason: "Picks which width and height the preset supplies. Only the two names exist.",
      },
      backdropFileExtension: { bucket: "structural", reason: REASONS.storedShape },
    },
  },
];
