UPDATE `journal_entry`
SET `tags` = '["activity","measure"]',
    `id` = 'activity-' || `id`
WHERE `id` LIKE 'measure-%';
