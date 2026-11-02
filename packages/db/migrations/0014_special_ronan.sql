CREATE TABLE `blueprint` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`client` text,
	`status` text DEFAULT 'intake' NOT NULL,
	`summary` text,
	`draft` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blueprint_userId_idx` ON `blueprint` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `blueprint_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`blueprint_id` text NOT NULL,
	`kind` text NOT NULL,
	`content` text,
	`summary` text,
	`image_key` text,
	`status` text DEFAULT 'ready' NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`blueprint_id`) REFERENCES `blueprint`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blueprint_evidence_blueprintId_idx` ON `blueprint_evidence` (`blueprint_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `blueprint_question` (
	`id` text PRIMARY KEY NOT NULL,
	`blueprint_id` text NOT NULL,
	`text` text NOT NULL,
	`rationale` text NOT NULL,
	`gap` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`answer` text,
	`answered_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`blueprint_id`) REFERENCES `blueprint`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blueprint_question_blueprintId_idx` ON `blueprint_question` (`blueprint_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `blueprint_requirement` (
	`id` text PRIMARY KEY NOT NULL,
	`blueprint_id` text NOT NULL,
	`area` text NOT NULL,
	`text` text NOT NULL,
	`status` text NOT NULL,
	`confidence` text NOT NULL,
	`source_evidence_ids` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`blueprint_id`) REFERENCES `blueprint`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `blueprint_requirement_blueprintId_idx` ON `blueprint_requirement` (`blueprint_id`,`sort_order`);