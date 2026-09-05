import { z } from "zod";

export const ServerStatusEnum = z.enum(["thinking", "searching", "painting", "speaking", "idle"]);

export const AudioFormatEnum = z.enum(["mp3", "pcm_16000"]);

export const ImageAspectRatioEnum = z.enum(["9:16", "1:1", "16:9"]);

export const StatusUpdateSchema = z.object({
  type: z.literal("status_update"),
  status: ServerStatusEnum,
  detail: z.string().optional(),
  payload: z
    .object({
      status: ServerStatusEnum,
      detail: z.string().optional(),
    })
    .optional(),
});

export const TextDeltaSchema = z.object({
  type: z.literal("text_delta"),
  token: z.string(),
  is_narration: z.boolean(),
  payload: z
    .object({
      token: z.string(),
      is_narration: z.boolean(),
    })
    .optional(),
});

export const AudioChunkSchema = z.object({
  type: z.literal("audio_chunk"),
  format: AudioFormatEnum,
  data: z.string(), // base64 encoded audio
  url: z.string().optional(),
  duration: z.number().nonnegative().optional(),
  sentence_index: z.number().int().nonnegative(),
  payload: z
    .object({
      format: AudioFormatEnum,
      data: z.string(),
      url: z.string().optional(),
      duration: z.number().nonnegative().optional(),
      sentence_index: z.number().int().nonnegative(),
    })
    .optional(),
});

export const StageShiftSchema = z.object({
  type: z.literal("stage_shift"),
  location_name: z.string(),
  backdrop_url: z.string().url(),
  lighting_tint: z.string(),
  soundscape_stems: z.array(z.string()),
  payload: z
    .object({
      location_name: z.string(),
      backdrop_url: z.string().url(),
      lighting_tint: z.string(),
      soundscape_stems: z.array(z.string()),
    })
    .optional(),
});

export const ImagePreviewSchema = z.object({
  type: z.literal("image_preview"),
  step: z.number().int().nonnegative(),
  total_steps: z.number().int().positive(),
  preview_base64: z.string(),
  payload: z
    .object({
      step: z.number().int().nonnegative(),
      total_steps: z.number().int().positive(),
      preview_base64: z.string(),
    })
    .optional(),
});

export const ImageReadySchema = z.object({
  type: z.literal("image_ready"),
  image_url: z.string().url(),
  aspect_ratio: ImageAspectRatioEnum,
  prompt_used: z.string(),
  payload: z
    .object({
      image_url: z.string().url(),
      aspect_ratio: ImageAspectRatioEnum,
      prompt_used: z.string(),
    })
    .optional(),
});

export const PhotoIdeasSchema = z.object({
  type: z.literal("photo_ideas"),
  ideas: z.array(z.string()),
  payload: z.object({ ideas: z.array(z.string()) }).optional(),
});

export const MindUpdateSchema = z.object({
  type: z.literal("mind_update"),
  affinity_delta: z.number(),
  current_affinity: z.number(),
  affinity_tier: z.string(),
  current_mood: z.string(),
  new_memory_logged: z.string().optional(),
  payload: z
    .object({
      affinity_delta: z.number(),
      current_affinity: z.number(),
      affinity_tier: z.string(),
      current_mood: z.string(),
      new_memory_logged: z.string().optional(),
    })
    .optional(),
});

export const ReplySuggestionsSchema = z.object({
  type: z.literal("reply_suggestions"),
  suggestions: z.array(z.string()).length(3),
  payload: z
    .object({
      suggestions: z.array(z.string()).length(3),
    })
    .optional(),
});

export const ErrorSchema = z.object({
  type: z.literal("error"),
  code: z.string(),
  message: z.string(),
  payload: z
    .object({
      code: z.string(),
      message: z.string(),
    })
    .optional(),
});

export const PongSchema = z.object({
  type: z.literal("pong"),
  timestamp: z.number().optional(),
  payload: z
    .object({
      timestamp: z.number().optional(),
    })
    .optional(),
});

export const ServerMessageSchema = z.discriminatedUnion("type", [
  StatusUpdateSchema,
  TextDeltaSchema,
  AudioChunkSchema,
  StageShiftSchema,
  ImagePreviewSchema,
  ImageReadySchema,
  PhotoIdeasSchema,
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
export type PhotoIdeasEvent = z.infer<typeof PhotoIdeasSchema>;
export type MindUpdateEvent = z.infer<typeof MindUpdateSchema>;
export type ReplySuggestionsEvent = z.infer<typeof ReplySuggestionsSchema>;
export type ErrorEvent = z.infer<typeof ErrorSchema>;
export type PongEvent = z.infer<typeof PongSchema>;
export type ServerMessage = z.infer<typeof ServerMessageSchema>;
