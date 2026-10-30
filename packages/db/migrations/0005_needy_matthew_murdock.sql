CREATE TABLE `measure_reference` (
	`id` text PRIMARY KEY NOT NULL,
	`label` text NOT NULL,
	`prompt` text NOT NULL,
	`width_mm` real NOT NULL,
	`height_mm` real NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL
);

INSERT INTO `measure_reference` (`id`, `label`, `prompt`, `width_mm`, `height_mm`, `sort_order`) VALUES
	('card', 'Credit card', 'credit card', 85.6, 53.98, 10),
	('a4', 'A4 sheet', 'sheet of paper', 297, 210, 20),
	('a5', 'A5 sheet', 'sheet of paper', 210, 148, 30),
	('a6', 'A6 sheet', 'sheet of paper', 148, 105, 40),
	('letter', 'US Letter sheet', 'sheet of paper', 279.4, 215.9, 50),
	('a3', 'A3 sheet', 'sheet of paper', 420, 297, 60),
	('postit', 'Sticky note 3×3 in', 'sticky note', 76.2, 76.2, 70),
	('quarter', 'US quarter', 'quarter', 24.26, 24.26, 80),
	('sdcard', 'SD card', 'SD card', 32, 24, 90),
	('dollar', 'US dollar bill', 'dollar bill', 156.1, 66.3, 100),
	('cd', 'CD / DVD', 'compact disc', 120, 120, 110),
	('playing-card', 'Playing card', 'playing card', 63, 88, 120),
	('passport', 'Passport (closed)', 'passport', 125, 88, 130),
	('business-card', 'Business card (US)', 'business card', 88.9, 50.8, 140);
