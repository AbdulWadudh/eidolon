import { desc } from "drizzle-orm";
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

export const characters = sqliteTable("characters", {
  id: text().primaryKey(),
  name: text().notNull(),
  tagline: text(),
  personality: text(),
  systemPrompt: text("system_prompt"),
  avatarUrl: text("avatar_url"),
  affinityTier: text("affinity_tier").default("Neutral"),
  affinityScore: integer("affinity_score").default(0),
  currentMood: text("current_mood").default("Neutral"),
  createdAt: integer("created_at").notNull(),
  appearance: text(),
  backgroundUrl: text("background_url"),
  avatarCrop: text("avatar_crop"),
  faceUrl: text("face_url"),
  affinityLocked: integer("affinity_locked").default(0),
  greeting: text(),
  scenario: text(),
  exampleDialogue: text("example_dialogue"),
  rules: text(),
  voice: text(),
  ownerId: text("owner_id"),
  isPublic: integer("is_public").default(0),
  forkedFrom: text("forked_from"),
  themePigment: text("theme_pigment"),
  pronouns: text(),
  defaultAffinity: integer("default_affinity"),
  defaultMood: text("default_mood"),
  outfit: text(),
  likes: text(),
  dislikes: text(),
  personaId: text("persona_id"),
  backgroundChosen: integer("background_chosen").default(0),
});

export const messages = sqliteTable(
  "messages",
  {
    id: text().primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    role: text().notNull(),
    content: text().notNull(),
    isNarration: integer("is_narration").default(0),
    audioUrl: text("audio_url"),
    createdAt: integer("created_at").notNull(),
    audioDuration: real("audio_duration"),
    imageUrl: text("image_url"),
    imageCaption: text("image_caption"),
    userId: text("user_id"),
  },
  (table) => [
    index("idx_messages_reader").on(table.characterId, table.userId, desc(table.createdAt)),
  ],
);

export const stages = sqliteTable(
  "stages",
  {
    id: text().primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    name: text().notNull(),
    backdropUrl: text("backdrop_url"),
    lightingTint: text("lighting_tint"),
    soundscapeStems: text("soundscape_stems"),
    updatedAt: integer("updated_at"),
    userId: text("user_id"),
  },
  (table) => [
    uniqueIndex("idx_stages_reader_name").on(table.characterId, table.userId, table.name),
  ],
);

export const prompts = sqliteTable("prompts", {
  key: text().primaryKey(),
  value: text().notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const chronicles = sqliteTable(
  "chronicles",
  {
    id: text().primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    chapterIndex: integer("chapter_index").notNull(),
    summaryText: text("summary_text").notNull(),
    createdAt: integer("created_at").notNull(),
    userId: text("user_id"),
  },
  (table) => [
    uniqueIndex("idx_chronicles_reader_chapter").on(
      table.characterId,
      table.userId,
      table.chapterIndex,
    ),
    index("idx_chronicles_reader").on(table.characterId, table.userId, table.chapterIndex),
    index("idx_chronicles_character").on(table.characterId, desc(table.chapterIndex)),
  ],
);

export const lorebookEntries = sqliteTable(
  "lorebook_entries",
  {
    id: text().primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    keys: text().notNull(),
    content: text().notNull(),
    requiredAffinity: integer("required_affinity").default(0),
    isActive: integer("is_active").default(1),
  },
  (table) => [index("idx_lorebook_character").on(table.characterId, table.isActive)],
);

export const characterPortraits = sqliteTable(
  "character_portraits",
  {
    id: text().primaryKey(),
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    url: text().notNull(),
    prompt: text(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [
    uniqueIndex("idx_portraits_url").on(table.characterId, table.url),
    index("idx_portraits_character").on(table.characterId, desc(table.createdAt)),
  ],
);

export const configOverrides = sqliteTable("config_overrides", {
  path: text().primaryKey(),
  value: text().notNull(),
  updatedAt: integer("updated_at").notNull(),
});

export const adminAudit = sqliteTable(
  "admin_audit",
  {
    id: text().primaryKey(),
    actorId: text("actor_id"),
    actorEmail: text("actor_email"),
    method: text().notNull(),
    path: text().notNull(),
    status: integer().notNull(),
    detail: text(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_admin_audit_time").on(desc(table.createdAt))],
);

export const characterState = sqliteTable(
  "character_state",
  {
    characterId: text("character_id")
      .notNull()
      .references(() => characters.id, { onDelete: "cascade" }),
    userId: text("user_id").notNull(),
    affinityScore: integer("affinity_score").notNull(),
    affinityTier: text("affinity_tier").notNull(),
    currentMood: text("current_mood").notNull(),
    affinityLocked: integer("affinity_locked").default(0),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [
    primaryKey({
      columns: [table.characterId, table.userId],
      name: "character_state_character_id_user_id_pk",
    }),
  ],
);

export const personas = sqliteTable(
  "personas",
  {
    id: text().primaryKey(),
    userId: text("user_id").notNull(),
    name: text().notNull(),
    photoUrl: text("photo_url"),
    photoCrop: text("photo_crop"),
    bio: text(),
    hobbies: text(),
    likes: text(),
    dislikes: text(),
    personality: text(),
    pronouns: text(),
    isDefault: integer("is_default").default(0),
    createdAt: integer("created_at").notNull(),
    updatedAt: integer("updated_at").notNull(),
  },
  (table) => [index("idx_personas_reader").on(table.userId, desc(table.updatedAt))],
);

export const personaChapters = sqliteTable(
  "persona_chapters",
  {
    id: text().primaryKey(),
    personaId: text("persona_id")
      .notNull()
      .references(() => personas.id, { onDelete: "cascade" }),
    chapterIndex: integer("chapter_index").notNull(),
    title: text(),
    body: text().notNull(),
    createdAt: integer("created_at").notNull(),
  },
  (table) => [index("idx_persona_chapters_persona").on(table.personaId, table.chapterIndex)],
);
