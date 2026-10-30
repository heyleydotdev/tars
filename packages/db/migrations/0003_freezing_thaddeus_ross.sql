ALTER TABLE `expense` ADD `title` text;
--> statement-breakpoint
UPDATE `expense` SET `title` = `description` WHERE `title` IS NULL;
--> statement-breakpoint
UPDATE `expense` SET `category` = 'other' WHERE `category` IS NULL;
