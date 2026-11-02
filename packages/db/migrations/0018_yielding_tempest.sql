ALTER TABLE `blueprint_question` ADD `kind` text DEFAULT 'short' NOT NULL;--> statement-breakpoint
ALTER TABLE `blueprint_question` ADD `options` text;