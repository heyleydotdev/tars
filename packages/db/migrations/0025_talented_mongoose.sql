PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_reminder` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text,
	`title` text NOT NULL,
	`remind_at` integer NOT NULL,
	`notes` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_reminder`("id", "user_id", "message_id", "title", "remind_at", "notes", "status", "created_at") SELECT "id", "user_id", "message_id", "title", "remind_at", "notes", "status", "created_at" FROM `reminder`;--> statement-breakpoint
DROP TABLE `reminder`;--> statement-breakpoint
ALTER TABLE `__new_reminder` RENAME TO `reminder`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `reminder_userId_idx` ON `reminder` (`user_id`);--> statement-breakpoint
CREATE INDEX `reminder_messageId_idx` ON `reminder` (`message_id`);--> statement-breakpoint
CREATE TABLE `__new_todo` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`message_id` text,
	`title` text NOT NULL,
	`notes` text,
	`due_at` integer,
	`priority` text,
	`status` text DEFAULT 'open' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`message_id`) REFERENCES `chat_message`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_todo`("id", "user_id", "message_id", "title", "notes", "due_at", "priority", "status", "created_at") SELECT "id", "user_id", "message_id", "title", "notes", "due_at", "priority", "status", "created_at" FROM `todo`;--> statement-breakpoint
DROP TABLE `todo`;--> statement-breakpoint
ALTER TABLE `__new_todo` RENAME TO `todo`;--> statement-breakpoint
CREATE INDEX `todo_userId_idx` ON `todo` (`user_id`);--> statement-breakpoint
CREATE INDEX `todo_messageId_idx` ON `todo` (`message_id`);