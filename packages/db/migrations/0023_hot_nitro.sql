DELETE FROM `ui_variant` WHERE `code` IS NULL;--> statement-breakpoint
ALTER TABLE `ui_variant` DROP COLUMN `image_key`;