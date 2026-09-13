import { z } from "zod";

export const UserRoleSchema = z.enum(["owner", "member"]);

export const AdminAccountSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  email: z.string(),
  role: UserRoleSchema,
  createdAt: z.union([z.string(), z.number()]).nullable(),
});

export const AdminAccountListSchema = z.object({ accounts: z.array(AdminAccountSchema) });

export const AdminAccountViewSchema = z.object({ account: AdminAccountSchema });

export const AdminAccountPatchSchema = z
  .object({
    role: UserRoleSchema.optional(),
    name: z.string().trim().min(1).optional(),
  })
  .refine((body) => body.role !== undefined || body.name !== undefined, {
    message: "Body must carry a role or a name.",
  });

export const PromptCategorySchema = z.enum(["persona", "writing", "media", "memory", "authoring"]);

export const AdminPromptSchema = z.object({
  key: z.string().min(1),
  value: z.string(),
  description: z.string(),
  category: PromptCategorySchema.nullable(),
  variables: z.array(z.string()),
  isCustom: z.boolean(),
  updatedAt: z.number(),
});

export const AdminPromptListSchema = z.object({ prompts: z.array(AdminPromptSchema) });

export const AdminPromptViewSchema = z.object({ prompt: AdminPromptSchema });

export const AdminPromptPutSchema = z.object({ value: z.string().min(1) });

export const AdminCharacterSchema = z.object({
  id: z.string().min(1),
  name: z.string(),
  tagline: z.string(),
  personality: z.string(),
  systemPrompt: z.string(),
  scenario: z.string(),
  rules: z.string(),
  exampleDialogue: z.string(),
  greeting: z.string(),
  voice: z.string(),
  pronouns: z.string(),
  ownerId: z.string().nullable(),
  isPublic: z.boolean(),
  forkedFrom: z.string().nullable(),
});

export const AdminCharacterListSchema = z.object({
  characters: z.array(AdminCharacterSchema.passthrough()),
});

export const AdminCharacterViewSchema = z.object({
  character: AdminCharacterSchema.passthrough(),
});

export const AdminCharacterDraftSchema = z.object({
  name: z.string().trim().min(1).optional(),
  tagline: z.string().optional(),
  personality: z.string().optional(),
  systemPrompt: z.string().optional(),
  scenario: z.string().optional(),
  rules: z.string().optional(),
  exampleDialogue: z.string().optional(),
  greeting: z.string().optional(),
  voice: z.string().optional(),
  pronouns: z.string().optional(),
  isPublic: z.boolean().optional(),
});

export const ThemeTokensSchema = z.object({
  mode: z.enum(["dark", "light"]),
  canvas: z.string(),
  card: z.string(),
  cardBorder: z.string(),
  inputSurface: z.string(),
  audioPillBg: z.string(),
  textPrimary: z.string(),
  textMuted: z.string(),
  primary: z.string(),
  primaryForeground: z.string(),
  secondary: z.string(),
  secondaryForeground: z.string(),
  success: z.string(),
  warning: z.string(),
  danger: z.string(),
  radius: z.number(),
  borderWidth: z.number(),
  translucency: z.number(),
  fontMain: z.string(),
  fontUI: z.string(),
  fontScale: z.number(),
});

export const ThemeTokenPatchSchema = ThemeTokensSchema.partial();

export const AdminThemeViewSchema = z.object({
  tokens: ThemeTokensSchema,
  defaults: ThemeTokensSchema,
  overrides: ThemeTokenPatchSchema,
});

export const AuditEntrySchema = z.object({
  id: z.string().min(1),
  actorId: z.string().nullable(),
  actorEmail: z.string().nullable(),
  method: z.string().min(1),
  path: z.string().min(1),
  status: z.number(),
  detail: z.string().nullable(),
  createdAt: z.number(),
});

export const AdminAuditViewSchema = z.object({
  total: z.number(),
  retain: z.number(),
  limit: z.number(),
  offset: z.number(),
  entries: z.array(AuditEntrySchema),
});

export const AdminErrorSchema = z.object({ error: z.string().min(1) });

export const AdminOkSchema = z.object({ ok: z.literal(true) });

export type UserRole = z.infer<typeof UserRoleSchema>;
export type AdminAccount = z.infer<typeof AdminAccountSchema>;
export type AdminAccountPatch = z.infer<typeof AdminAccountPatchSchema>;
export type AdminPrompt = z.infer<typeof AdminPromptSchema>;
export type AdminCharacter = z.infer<typeof AdminCharacterSchema>;
export type AdminCharacterDraft = z.infer<typeof AdminCharacterDraftSchema>;
export type AdminThemeView = z.infer<typeof AdminThemeViewSchema>;
export type AuditEntry = z.infer<typeof AuditEntrySchema>;
export type AdminAuditView = z.infer<typeof AdminAuditViewSchema>;
export type ThemeTokenPatch = z.infer<typeof ThemeTokenPatchSchema>;
