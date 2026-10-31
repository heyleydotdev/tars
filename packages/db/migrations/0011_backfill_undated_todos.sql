UPDATE `todo`
SET `due_at` = `created_at`
WHERE `due_at` IS NULL;
