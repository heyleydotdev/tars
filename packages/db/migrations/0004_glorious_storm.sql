PRAGMA foreign_keys=OFF;--> statement-breakpoint
UPDATE `expense` SET `occurred_at` = `created_at` WHERE `occurred_at` IS NULL;--> statement-breakpoint
UPDATE `journal_entry` SET `occurred_at` = `created_at` WHERE `occurred_at` IS NULL;--> statement-breakpoint
CREATE TABLE `__new_expense` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text NOT NULL,
	`title` text,
	`description` text NOT NULL,
	`amount_cents` integer NOT NULL,
	`currency` text DEFAULT 'USD' NOT NULL,
	`category` text,
	`occurred_at` integer NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_expense`("id", "user_id", "message_id", "title", "description", "amount_cents", "currency", "category", "occurred_at", "created_at") SELECT "id", "user_id", "message_id", "title", "description", "amount_cents", "currency", "category", "occurred_at", "created_at" FROM `expense`;--> statement-breakpoint
DROP TABLE `expense`;--> statement-breakpoint
ALTER TABLE `__new_expense` RENAME TO `expense`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `expense_userId_idx` ON `expense` (`user_id`);--> statement-breakpoint
CREATE INDEX `expense_messageId_idx` ON `expense` (`message_id`);--> statement-breakpoint
CREATE TABLE `__new_journal_entry` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text NOT NULL,
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
CREATE INDEX `journal_entry_userId_idx` ON `journal_entry` (`user_id`);--> statement-breakpoint
CREATE INDEX `journal_entry_messageId_idx` ON `journal_entry` (`message_id`);