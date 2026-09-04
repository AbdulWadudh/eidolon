import { z } from "zod";

export const ChatTurnSchema = z.object({
  type: z.literal("chat_turn"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  text: z.string().min(1, "text cannot be empty"),
  allow_search: z.boolean().default(true),
  user_timezone: z.string().default("UTC"),
});

export const InterruptSchema = z.object({
  type: z.literal("interrupt"),
  character_id: z.string().min(1, "character_id cannot be empty"),
});

export const RequestImageSchema = z.object({
  type: z.literal("request_image"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  prompt_override: z.string().optional(),
});

export const RegenerateSuggestionsSchema = z.object({
  type: z.literal("regenerate_suggestions"),
  character_id: z.string().min(1, "character_id cannot be empty"),
  last_message_id: z.string().min(1, "last_message_id cannot be empty"),
});

export const PingSchema = z.object({
  type: z.literal("ping"),
  timestamp: z.number().optional(),
});

export const ClientMessageSchema = z.discriminatedUnion("type", [
  ChatTurnSchema,
  InterruptSchema,
  RequestImageSchema,
  RegenerateSuggestionsSchema,
  PingSchema,
]);

export type ChatTurnEvent = z.infer<typeof ChatTurnSchema>;
export type InterruptEvent = z.infer<typeof InterruptSchema>;
export type RequestImageEvent = z.infer<typeof RequestImageSchema>;
export type RegenerateSuggestionsEvent = z.infer<typeof RegenerateSuggestionsSchema>;
export type PingEvent = z.infer<typeof PingSchema>;
export type ClientMessage = z.infer<typeof ClientMessageSchema>;
