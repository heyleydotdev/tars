CREATE TABLE `ui_finding` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`label` text NOT NULL,
	`description` text NOT NULL,
	`severity` text NOT NULL,
	`included` integer DEFAULT 1 NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `ui_review`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ui_finding_reviewId_idx` ON `ui_finding` (`review_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `ui_review` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text,
	`image_key` text NOT NULL,
	`summary` text,
	`status` text DEFAULT 'created' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ui_review_userId_idx` ON `ui_review` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `ui_variant` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`image_key` text NOT NULL,
	`prompt` text NOT NULL,
	`instruction` text,
	`findings` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `ui_review`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `ui_variant_reviewId_idx` ON `ui_variant` (`review_id`,`created_at`);