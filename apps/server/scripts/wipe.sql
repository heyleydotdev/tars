-- Deletes everything the app shows, keeping user accounts and their sessions so
-- nobody is logged out. Run it through `bun run wipe`, which asks for
-- confirmation first. R2 objects (measure photos, incident and UI screenshots)
-- are not touched, so deleting rows leaves orphaned files behind.
--
-- The built-in measure references (user_id IS NULL, inserted by migration 0005)
-- are app content, not user data, so they stay.
--
-- Order matters: children first, so the wipe does not depend on cascade.

DELETE FROM todo;
DELETE FROM reminder;
DELETE FROM expense;
DELETE FROM journal_entry;

DELETE FROM chat_thinking;
DELETE FROM chat_message;
DELETE FROM chat;

DELETE FROM blueprint_evidence;
DELETE FROM blueprint_requirement;
DELETE FROM blueprint_question;
DELETE FROM blueprint;

DELETE FROM incident_evidence;
DELETE FROM incident_event;
DELETE FROM incident_question;
DELETE FROM incident_analysis;
DELETE FROM incident;

DELETE FROM measure_run_item;
DELETE FROM measure_run;
DELETE FROM measure_reference WHERE user_id IS NOT NULL;

DELETE FROM ui_variant;
DELETE FROM ui_finding;
DELETE FROM ui_review;

DELETE FROM usage_event;
DELETE FROM verification;
