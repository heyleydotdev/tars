PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_expense` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text,
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
CREATE INDEX `expense_messageId_idx` ON `expense` (`message_id`);