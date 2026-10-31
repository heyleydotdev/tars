CREATE TABLE `incident` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` text NOT NULL,
	`title` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`summary` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `incident_userId_idx` ON `incident` (`user_id`,`updated_at`);--> statement-breakpoint
CREATE TABLE `incident_analysis` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`outcome` text NOT NULL,
	`root_cause` text NOT NULL,
	`confidence` text NOT NULL,
	`supporting_event_ids` text NOT NULL,
	`alternatives` text NOT NULL,
	`postmortem` text,
	`status` text DEFAULT 'draft' NOT NULL,
	`approved_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incident`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `incident_analysis_incidentId_idx` ON `incident_analysis` (`incident_id`);--> statement-breakpoint
CREATE TABLE `incident_event` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`occurred_at` integer,
	`time_source` text,
	`description` text NOT NULL,
	`confidence` text NOT NULL,
	`source_evidence_ids` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incident`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `incident_event_incidentId_idx` ON `incident_event` (`incident_id`,`sort_order`);--> statement-breakpoint
CREATE TABLE `incident_evidence` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`kind` text NOT NULL,
	`source` text DEFAULT 'upload' NOT NULL,
	`content` text,
	`image_key` text,
	`occurred_at` integer,
	`time_source` text,
	`time_note` text,
	`summary` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`error` text,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incident`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `incident_evidence_incidentId_idx` ON `incident_evidence` (`incident_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `incident_question` (
	`id` text PRIMARY KEY NOT NULL,
	`incident_id` text NOT NULL,
	`text` text NOT NULL,
	`rationale` text NOT NULL,
	`gap` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`answer` text,
	`answered_at` integer,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`incident_id`) REFERENCES `incident`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `incident_question_incidentId_idx` ON `incident_question` (`incident_id`,`status`);