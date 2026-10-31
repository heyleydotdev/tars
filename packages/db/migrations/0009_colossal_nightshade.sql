PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_journal_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text,
	`title` text,
	`content` text NOT NULL,
	`mood` text,
	`tags` text DEFAULT '[]' NOT NULL,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_journal_entry`("id", "user_id", "message_id", "title", "content", "mood", "tags", "occurred_at", "created_at") SELECT "id", "user_id", "message_id", "title", "content", "mood", "tags", "occurred_at", "created_at" FROM `journal_entry`;--> statement-breakpoint
DROP TABLE `journal_entry`;--> statement-breakpoint
ALTER TABLE `__new_journal_entry` RENAME TO `journal_entry`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `journal_entry_userId_idx` ON `journal_entry` (`user_id`);--> statement-breakpoint
CREATE INDEX `journal_entry_messageId_idx` ON `journal_entry` (`message_id`);