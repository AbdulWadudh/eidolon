CREATE TABLE `persona_chapters` (
	`id` text PRIMARY KEY NOT NULL,
	`persona_id` text NOT NULL,
	`chapter_index` integer NOT NULL,
	`title` text,
	`body` text NOT NULL,
	`created_at` integer NOT NULL,
	FOREIGN KEY (`persona_id`) REFERENCES `personas`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `idx_persona_chapters_persona` ON `persona_chapters` (`persona_id`,`chapter_index`);--> statement-breakpoint
CREATE TABLE `personas` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`name` text NOT NULL,
	`photo_url` text,
	`photo_crop` text,
	`bio` text,
	`hobbies` text,
	`likes` text,
	`dislikes` text,
	`personality` text,
	`is_default` integer DEFAULT 0,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL
);
--> statement-breakpoint
CREATE INDEX `idx_personas_reader` ON `personas` (`user_id`,"updated_at" desc);--> statement-breakpoint
ALTER TABLE `characters` ADD `likes` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `dislikes` text;--> statement-breakpoint
ALTER TABLE `characters` ADD `persona_id` text;