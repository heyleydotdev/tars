CREATE TABLE `measure_run` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`reference_id` text,
	`reference_label` text NOT NULL,
	`reference_prompt` text NOT NULL,
	`reference_width_mm` real NOT NULL,
	`reference_height_mm` real NOT NULL,
	`prompts` text NOT NULL,
	`unit` text NOT NULL,
	`item_count` integer NOT NULL,
	`measured_count` integer NOT NULL,
	`cover_thumb` text NOT NULL,
	`status` text DEFAULT 'draft' NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `measure_run_item` (
	`id` text PRIMARY KEY NOT NULL,
	`run_id` text NOT NULL,
	`name` text NOT NULL,
	`sort_order` integer NOT NULL,
	`status` text NOT NULL,
	`error` text,
	`image_width` integer NOT NULL,
	`image_height` integer NOT NULL,
	`result` text,
	`image_key` text NOT NULL,
	`thumb_key` text NOT NULL,
	FOREIGN KEY (`run_id`) REFERENCES `measure_run`(`id`) ON UPDATE no action ON DELETE cascade
);
