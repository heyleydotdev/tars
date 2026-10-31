CREATE INDEX `measure_run_user_status_idx` ON `measure_run` (`user_id`,`status`,`created_at`);--> statement-breakpoint
CREATE INDEX `measure_run_item_runId_idx` ON `measure_run_item` (`run_id`);