import { z } from "zod";

export const ServerStatusEnum = z.enum(["thinking", "searching", "painting", "speaking", "idle"]);

export const AudioFormatEnum = z.enum(["mp3", "pcm_16000"]);

export const ImageAspectRatioEnum = z.enum(["9:16", "1:1"]);

export const StatusUpdateSchema = z.object({
  type: z.literal("status_update"),
  status: ServerStatusEnum,
  detail: z.string().optional(),
});

export const TextDeltaSchema = z.object({
  type: z.literal("text_delta"),
  token: z.string(),
  is_narration: z.boolean(),
});

export const AudioChunkSchema = z.object({
  type: z.literal("audio_chunk"),
  format: AudioFormatEnum,
  data: z.string(), // base64 encoded audio
  sentence_index: z.number().int().nonnegative(),
});

export const StageShiftSchema = z.object({
  type: z.literal("stage_shift"),
  location_name: z.string(),
  backdrop_url: z.string().url(),
  lighting_tint: z.string(),
  soundscape_stems: z.array(z.string()),
});

export const ImagePreviewSchema = z.object({
  type: z.literal("image_preview"),
  step: z.number().int().nonnegative(),
  total_steps: z.number().int().positive(),
  preview_base64: z.string(),
});

export const ImageReadySchema = z.object({
  type: z.literal("image_ready"),
  image_url: z.string().url(),
  aspect_ratio: ImageAspectRatioEnum,
  prompt_used: z.string(),
});

export const MindUpdateSchema = z.object({
  type: z.literal("mind_update"),
  affinity_delta: z.number(),
  current_affinity: z.number(),
  affinity_tier: z.string(),
  current_mood: z.string(),
  new_memory_logged: z.string().optional(),
});

export const ReplySuggestionsSchema = z.object({
  type: z.literal("reply_suggestions"),
  suggestions: z.array(z.string()).length(3),
});

export const ErrorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
});

export const PongSchema = z.object({
  type: z.literal("pong"),
  timestamp: z.number().optional(),
});

export const ServerMessageSchema = z.discriminatedUnion("type", [
  StatusUpdateSchema,
  TextDeltaSchema,
  AudioChunkSchema,
  StageShiftSchema,
  ImagePreviewSchema,
  ImageReadySchema,
  MindUpdateSchema,
  ReplySuggestionsSchema,
  ErrorSchema,
  PongSchema,
]);

export type ServerStatus = z.infer<typeof ServerStatusEnum>;
export type AudioFormat = z.infer<typeof AudioFormatEnum>;
export type ImageAspectRatio = z.infer<typeof ImageAspectRatioEnum>;
export type StatusUpdateEvent = z.infer<typeof StatusUpdateSchema>;
export type TextDeltaEvent = z.infer<typeof TextDeltaSchema>;
export type AudioChunkEvent = z.infer<typeof AudioChunkSchema>;
export type StageShiftEvent = z.infer<typeof StageShiftSchema>;
export type ImagePreviewEvent = z.infer<typeof ImagePreviewSchema>;
export type ImageReadyEvent = z.infer<typeof ImageReadySchema>;
export type MindUpdateEvent = z.infer<typeof MindUpdateSchema>;
export type ReplySuggestionsEvent = z.infer<typeof ReplySuggestionsSchema>;
export type ErrorEvent = z.infer<typeof ErrorSchema>;
export type PongEvent = z.infer<typeof PongSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
