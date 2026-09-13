DROP INDEX `idx_stages_character_name`;--> statement-breakpoint
ALTER TABLE `stages` ADD `user_id` text;--> statement-breakpoint
CREATE UNIQUE INDEX `idx_stages_reader_name` ON `stages` (`character_id`,`user_id`,`name`);