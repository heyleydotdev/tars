PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ui_variant` (
	`id` text PRIMARY KEY NOT NULL,
	`review_id` text NOT NULL,
	`image_key` text,
	`code` text,
	`prompt` text NOT NULL,
	`instruction` text,
	`findings` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`review_id`) REFERENCES `ui_review`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ui_variant`("id", "review_id", "image_key", "code", "prompt", "instruction", "findings", "created_at") SELECT "id", "review_id", "image_key", NULL, "prompt", "instruction", "findings", "created_at" FROM `ui_variant`;--> statement-breakpoint
DROP TABLE `ui_variant`;--> statement-breakpoint
ALTER TABLE `__new_ui_variant` RENAME TO `ui_variant`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ui_variant_reviewId_idx` ON `ui_variant` (`review_id`,`created_at`);