CREATE TABLE `admin_audit` (
	`id` text PRIMARY KEY NOT NULL,
	`actor_id` text,
	`actor_email` text,
	`method` text NOT NULL,
	`path` text NOT NULL,
	`status` integer NOT NULL,
	`detail` text,
	`created_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_admin_audit_time` ON `admin_audit` ("created_at" desc);--> statement-breakpoint
CREATE TABLE `character_portraits` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`url` text NOT NULL,
	`prompt` text,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_portraits_url` ON `character_portraits` (`character_id`,`url`);--> statement-breakpoint
CREATE INDEX `idx_portraits_character` ON `character_portraits` (`character_id`,"created_at" desc);--> statement-breakpoint
CREATE TABLE `character_state` (
	`character_id` text NOT NULL,
	`user_id` text NOT NULL,
	`affinity_score` integer NOT NULL,
	`affinity_tier` text NOT NULL,
	`current_mood` text NOT NULL,
	`affinity_locked` integer DEFAULT 0,
	`updated_at` integer NOT NULL,
	PRIMARY KEY(`character_id`, `user_id`),
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `characters` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`tagline` text,
	`personality` text,
	`system_prompt` text,
	`avatar_url` text,
	`affinity_tier` text DEFAULT 'Neutral',
	`affinity_score` integer DEFAULT 0,
	`current_mood` text DEFAULT 'Neutral',
	`created_at` integer NOT NULL,
	`appearance` text,
	`background_url` text,
	`avatar_crop` text,
	`face_url` text,
	`affinity_locked` integer DEFAULT 0,
	`greeting` text,
	`scenario` text,
	`example_dialogue` text,
	`rules` text,
	`voice` text,
	`owner_id` text,
	`is_public` integer DEFAULT 0,
	`forked_from` text,
	`theme_pigment` text,
	`pronouns` text,
	`default_affinity` integer,
	`default_mood` text
);
--> statement-breakpoint
CREATE TABLE `chronicles` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`chapter_index` integer NOT NULL,
	`summary_text` text NOT NULL,
	`created_at` integer NOT NULL,
	`user_id` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_chronicles_reader_chapter` ON `chronicles` (`character_id`,`user_id`,`chapter_index`);--> statement-breakpoint
CREATE INDEX `idx_chronicles_reader` ON `chronicles` (`character_id`,`user_id`,`chapter_index`);--> statement-breakpoint
CREATE INDEX `idx_chronicles_character` ON `chronicles` (`character_id`,"chapter_index" desc);--> statement-breakpoint
CREATE TABLE `config_overrides` (
	`path` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `lorebook_entries` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`keys` text NOT NULL,
	`content` text NOT NULL,
	`required_affinity` integer DEFAULT 0,
	`is_active` integer DEFAULT 1,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_lorebook_character` ON `lorebook_entries` (`character_id`,`is_active`);--> statement-breakpoint
CREATE TABLE `messages` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`role` text NOT NULL,
	`content` text NOT NULL,
	`is_narration` integer DEFAULT 0,
	`audio_url` text,
	`created_at` integer NOT NULL,
	`audio_duration` real,
	`image_url` text,
	`image_caption` text,
	`user_id` text,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_messages_reader` ON `messages` (`character_id`,`user_id`,"created_at" desc);--> statement-breakpoint
CREATE TABLE `prompts` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `stages` (
	`id` text PRIMARY KEY NOT NULL,
	`character_id` text NOT NULL,
	`name` text NOT NULL,
	`backdrop_url` text,
	`lighting_tint` text,
	`soundscape_stems` text,
	`updated_at` integer,
	FOREIGN KEY (`character_id`) REFERENCES `characters`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_stages_character_name` ON `stages` (`character_id`,`name`);