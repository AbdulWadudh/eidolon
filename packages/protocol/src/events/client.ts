import { z } from "zod";

export const ChatTurnSchema = z.object({
  type: z.literal("chat_turn"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  text: z.string().min(1, "text cannot be empty"),
  allow_search: z.boolean().default(true),
  user_timezone: z.string().default("UTC"),
  live_voice: z.boolean().default(false),
  think: z.boolean().default(false),
  mood: z.string().optional(),
});

export const InterruptSchema = z.object({
  type: z.literal("interrupt"),
  character_id: z.string().min(1, "character_id cannot be empty"),
});

export const RequestImageSchema = z.object({
  type: z.literal("request_image"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  prompt_override: z.string().optional(),
  orientation: z.enum(["portrait", "landscape", "square"]).optional(),
  reference_url: z.string().optional(),
});

export const RequestPhotoIdeasSchema = z.object({
  type: z.literal("request_photo_ideas"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  editing: z.boolean().optional(),
  exclude: z.array(z.string()).default([]),
});

export const RegenerateSuggestionsSchema = z.object({
  type: z.literal("regenerate_suggestions"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  last_message_id: z.string().min(1, "last_message_id cannot be empty"),
  exclude: z.array(z.string()).default([]),
});

export const ReplyVariantsSchema = z.object({
  type: z.literal("reply_variants"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  allow_search: z.boolean().default(true),
  user_timezone: z.string().default("UTC"),
  mood: z.string().optional(),
});

export const RegenerateReplySchema = z.object({
  type: z.literal("regenerate_reply"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  allow_search: z.boolean().default(true),
  user_timezone: z.string().default("UTC"),
  mood: z.string().optional(),
});

export const ResynthesizeAudioSchema = z.object({
  type: z.literal("resynthesize_audio"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  message_id: z.string().min(1, "message_id cannot be empty"),
});

export const EnhanceMessageSchema = z.object({
  type: z.literal("enhance_message"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  text: z.string().min(1, "text cannot be empty"),
});

export const VoiceInputSchema = z.object({
  type: z.literal("voice_input"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  format: z.string().min(1, "format cannot be empty"),
  data: z.string().min(1, "data cannot be empty"),
  allow_search: z.boolean().default(true),
  user_timezone: z.string().default("UTC"),
  live_voice: z.boolean().default(true),
});

export const PingSchema = z.object({
  type: z.literal("ping"),
  timestamp: z.number().optional(),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ChatTurnSchema,
  InterruptSchema,
  RequestImageSchema,
  RequestPhotoIdeasSchema,
  RegenerateReplySchema,
  ReplyVariantsSchema,
  ResynthesizeAudioSchema,
  RegenerateSuggestionsSchema,
  EnhanceMessageSchema,
  VoiceInputSchema,
  PingSchema,
]);

export type ChatTurnEvent = z.infer<typeof ChatTurnSchema>;
export type RegenerateReplyEvent = z.infer<typeof RegenerateReplySchema>;
export type ReplyVariantsEvent = z.infer<typeof ReplyVariantsSchema>;
export type ResynthesizeAudioEvent = z.infer<typeof ResynthesizeAudioSchema>;
export type VoiceInputEvent = z.infer<typeof VoiceInputSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
