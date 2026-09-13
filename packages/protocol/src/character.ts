import { z } from "zod";

export const EidolonMetadataSchema = z.object({
  stage_deck: z.array(z.string()).default([]),
  voice_id: z.string().optional(),
  theme_pigment: z.string().optional(),
  affinity_score: z.number().default(0),
});

export const TavernV2CharacterDataSchema = z.object({
  name: z.string(),
  description: z.string(),
  personality: z.string(),
  scenario: z.string(),
  first_mes: z.string(),
  mes_example: z.string(),
  creator_notes: z.string().optional(),
  system_prompt: z.string().optional(),
  post_history_instructions: z.string().optional(),
  alternate_greetings: z.array(z.string()).optional(),
  character_book: z.unknown().optional(),
  tags: z.array(z.string()).optional(),
  creator: z.string().optional(),
  character_version: z.string().optional(),
  eidolon_metadata: EidolonMetadataSchema.optional(),
});

export const TavernV2CardSchema = z.object({
  spec: z.literal("chara_card_v2"),
  spec_version: z.literal("2.0"),
  data: TavernV2CharacterDataSchema,
});

export type EidolonMetadata = z.infer<typeof EidolonMetadataSchema>;
export type TavernV2CharacterData = z.infer<typeof TavernV2CharacterDataSchema>;
export type TavernV2Card = z.infer<typeof TavernV2CardSchema>;
