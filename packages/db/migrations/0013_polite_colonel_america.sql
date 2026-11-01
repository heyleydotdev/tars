ALTER TABLE `chat_message` ADD `kind` text DEFAULT 'chat' NOT NULL;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `period` text;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `range_start` integer;--> statement-breakpoint
ALTER TABLE `chat_message` ADD `range_end` integer;