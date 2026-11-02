ALTER TABLE `incident_question` ADD `kind` text DEFAULT 'short' NOT NULL;--> statement-breakpoint
ALTER TABLE `incident_question` ADD `options` text;