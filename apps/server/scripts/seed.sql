-- Demo data so a fresh install shows every screen with something real in it.
--
-- Run it through `bun run seed`, which asks which account gets the data and
-- swaps the seed_target marker for that account's id. The marker names a table
-- that does not exist on purpose: without the CLI the file fails to prepare
-- instead of silently filling some other account.
-- Re-running replaces the seed rows instead of duplicating them, because the
-- ids are fixed.
--
-- Measure runs and UI reviews are not seeded: both need uploaded images in R2,
-- so those tabs start empty. Measure already ships built-in reference presets.
--
--   bun run seed          # local D1
--   bun run seed:remote   # deployed D1

-- Chat and its messages -------------------------------------------------------

INSERT OR REPLACE INTO chat (id, user_id, title, created_at, updated_at)
VALUES (
  'seed-chat-week',
  (SELECT id FROM seed_target),
  'Planning the week',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 3600000)
);

INSERT OR REPLACE INTO chat_message (id, chat_id, role, content, status, kind, created_at)
VALUES (
  'seed-msg-1',
  'seed-chat-week',
  'user',
  'Morning. Plan my week from these notes: client kickoff is Thursday, the dashboard redesign is due Wednesday, and I still owe the accountant the Q3 receipts.',
  'completed',
  'chat',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000)
);

INSERT OR REPLACE INTO chat_message (id, chat_id, role, content, status, kind, created_at)
VALUES (
  'seed-msg-2',
  'seed-chat-week',
  'assistant',
  'Planned. Your agenda now has:

- **Prepare client kickoff agenda** — due Thursday
- **Finish dashboard redesign** — due Wednesday
- **Send Q3 receipts to the accountant** — due Friday
- **Call the accountant** — reminder for tomorrow
- **Design standup** — reminder for next week',
  'completed',
  'chat',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604740000)
);

INSERT OR REPLACE INTO chat_message (id, chat_id, role, content, status, kind, created_at)
VALUES (
  'seed-msg-3',
  'seed-chat-week',
  'user',
  'Spent 42.30 on groceries yesterday. Also 18 for a train ticket this morning, and coffee with Priya was 9.40.',
  'completed',
  'chat',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 259200000)
);

INSERT OR REPLACE INTO chat_message (id, chat_id, role, content, status, kind, created_at)
VALUES (
  'seed-msg-4',
  'seed-chat-week',
  'assistant',
  'Logged three expenses: groceries 42.30 (food), train ticket 18.00 (transport), coffee 9.40 (food).',
  'completed',
  'chat',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 259140000)
);

INSERT OR REPLACE INTO chat_message (id, chat_id, role, content, status, kind, created_at)
VALUES (
  'seed-msg-5',
  'seed-chat-week',
  'user',
  'Wrapped the onboarding flow and felt good about it. Also the design standup moved to 10:00 from now on.',
  'completed',
  'chat',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 5400000)
);

-- Tasks, reminders, expenses, journal ----------------------------------------

INSERT OR REPLACE INTO todo (id, user_id, message_id, title, notes, due_at, status, created_at)
VALUES (
  'seed-todo-1',
  (SELECT id FROM seed_target),
  'seed-msg-2',
  'Prepare client kickoff agenda',
  'Scope, timeline, and who signs off.',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) + 172800000),
  'open',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000)
);

INSERT OR REPLACE INTO todo (id, user_id, message_id, title, notes, due_at, status, created_at)
VALUES (
  'seed-todo-2',
  (SELECT id FROM seed_target),
  'seed-msg-2',
  'Finish dashboard redesign',
  'Ship the dark charts and the empty states.',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) + 86400000),
  'open',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000)
);

INSERT OR REPLACE INTO todo (id, user_id, message_id, title, notes, due_at, status, created_at)
VALUES (
  'seed-todo-3',
  (SELECT id FROM seed_target),
  'seed-msg-2',
  'Send Q3 receipts to the accountant',
  NULL,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) + 259200000),
  'open',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000)
);

INSERT OR REPLACE INTO todo (id, user_id, message_id, title, notes, due_at, status, created_at)
VALUES (
  'seed-todo-4',
  (SELECT id FROM seed_target),
  'seed-msg-2',
  'Fix CSV export for the monthly report',
  'Quotes were dropped on amounts with thousands separators.',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 172800000),
  'done',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000)
);

INSERT OR REPLACE INTO reminder (id, user_id, message_id, title, remind_at, notes, status, created_at)
VALUES (
  'seed-reminder-1',
  (SELECT id FROM seed_target),
  'seed-msg-2',
  'Call the accountant',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) + 86400000),
  'Ask about the Q3 filing deadline.',
  'pending',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000)
);

INSERT OR REPLACE INTO reminder (id, user_id, message_id, title, remind_at, notes, status, created_at)
VALUES (
  'seed-reminder-2',
  (SELECT id FROM seed_target),
  'seed-msg-5',
  'Design standup',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) + 604800000),
  'Moved to 10:00.',
  'pending',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 5400000)
);

INSERT OR REPLACE INTO expense (id, user_id, message_id, title, description, amount_cents, currency, category, occurred_at, created_at)
VALUES (
  'seed-expense-1',
  (SELECT id FROM seed_target),
  'seed-msg-4',
  'Groceries',
  'Weekly shop',
  4230,
  'USD',
  'food',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 259200000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 259200000)
);

INSERT OR REPLACE INTO expense (id, user_id, message_id, title, description, amount_cents, currency, category, occurred_at, created_at)
VALUES (
  'seed-expense-2',
  (SELECT id FROM seed_target),
  'seed-msg-4',
  'Train ticket',
  'Monthly commute top-up',
  1800,
  'USD',
  'transport',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 21600000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 21600000)
);

INSERT OR REPLACE INTO expense (id, user_id, message_id, title, description, amount_cents, currency, category, occurred_at, created_at)
VALUES (
  'seed-expense-3',
  (SELECT id FROM seed_target),
  'seed-msg-4',
  'Coffee with Priya',
  'Scope chat about the client portal',
  940,
  'USD',
  'food',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 259200000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 259200000)
);

INSERT OR REPLACE INTO expense (id, user_id, message_id, title, description, amount_cents, currency, category, occurred_at, created_at)
VALUES (
  'seed-expense-4',
  (SELECT id FROM seed_target),
  'seed-msg-4',
  'Monitoring subscription',
  'Error tracking, monthly',
  1500,
  'USD',
  'bills',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 432000000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 432000000)
);

INSERT OR REPLACE INTO expense (id, user_id, message_id, title, description, amount_cents, currency, category, occurred_at, created_at)
VALUES (
  'seed-expense-5',
  (SELECT id FROM seed_target),
  'seed-msg-4',
  'Standing desk',
  'Home office upgrade',
  24900,
  'USD',
  'home',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 1036800000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 1036800000)
);

INSERT OR REPLACE INTO journal_entry (id, user_id, message_id, title, content, mood, tags, occurred_at, created_at)
VALUES (
  'seed-note-1',
  (SELECT id FROM seed_target),
  'seed-msg-5',
  'Shipped onboarding',
  'Finished the new onboarding flow and it finally feels calm. Three screens instead of six, and the empty state explains itself.',
  'proud',
  '["work","shipping"]',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 7200000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 7200000)
);

INSERT OR REPLACE INTO journal_entry (id, user_id, message_id, title, content, mood, tags, occurred_at, created_at)
VALUES (
  'seed-note-2',
  (SELECT id FROM seed_target),
  NULL,
  'Slow start',
  'Woke up late and spent the first hour re-reading yesterday''s notes. The kickoff agenda is still half written.',
  'tired',
  '["work"]',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 93600000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 93600000)
);

INSERT OR REPLACE INTO journal_entry (id, user_id, message_id, title, content, mood, tags, occurred_at, created_at)
VALUES (
  'seed-note-3',
  (SELECT id FROM seed_target),
  NULL,
  'Walk by the river',
  'Left the laptop at home and walked for an hour. The client portal hierarchy made sense on the way back without opening Figma.',
  'calm',
  '["life"]',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 180000000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 180000000)
);

INSERT OR REPLACE INTO journal_entry (id, user_id, message_id, title, content, mood, tags, occurred_at, created_at)
VALUES (
  'seed-note-4',
  (SELECT id FROM seed_target),
  NULL,
  'Kickoff nerves',
  'The client call moved to Thursday and I still need pricing. Not sure the retainer covers the extra approval screen.',
  'anxious',
  '["work","client"]',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 266400000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 266400000)
);

INSERT OR REPLACE INTO journal_entry (id, user_id, message_id, title, content, mood, tags, occurred_at, created_at)
VALUES (
  'seed-note-5',
  (SELECT id FROM seed_target),
  NULL,
  'Reading list',
  'Two books to finish: the one about design systems and the one about writing clearly.',
  NULL,
  '["reading"]',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 352800000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 352800000)
);

-- Journal activity feed (rows the app writes when a feature runs) -------------

INSERT OR REPLACE INTO journal_entry (id, user_id, message_id, title, content, mood, tags, occurred_at, created_at)
VALUES (
  'activity-blueprint-drafted-seed-blueprint-1',
  (SELECT id FROM seed_target),
  NULL,
  'Proposal drafted',
  'Client portal redesign',
  NULL,
  '["activity","blueprint"]',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 10800000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 10800000)
);

INSERT OR REPLACE INTO journal_entry (id, user_id, message_id, title, content, mood, tags, occurred_at, created_at)
VALUES (
  'activity-incident-rootcause-seed-incident-1',
  (SELECT id FROM seed_target),
  NULL,
  'Root cause found',
  'Checkout 502s after deploy',
  NULL,
  '["activity","incident"]',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 14400000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 14400000)
);

-- Blueprint -------------------------------------------------------------------

INSERT OR REPLACE INTO blueprint (id, user_id, title, client, status, summary, hierarchy, flow, draft, created_at, updated_at)
VALUES (
  'seed-blueprint-1',
  (SELECT id FROM seed_target),
  'Client portal redesign',
  'Northwind',
  'drafted',
  'A self-serve portal so clients can see project progress, approve milestones, and pay invoices without emailing us.',
  '{"groups":[{"name":"Access","items":["Sign in with a magic link","Password reset","Invite a teammate"]},{"name":"Workspace","items":["Project list","Project overview","Activity feed"]},{"name":"Billing","items":["Plan and usage","Invoices","Payment method"]}]}',
  '{"steps":[{"label":"Open portal","detail":"Client lands on sign-in from the emailed link.","kind":"entry"},{"label":"Verify email","detail":"Magic link confirms the address, no password to remember.","kind":"decision"},{"label":"Project overview","detail":"Active projects, recent files, and the invoice banner.","kind":"screen"},{"label":"Invoice overdue?","detail":"An overdue invoice blocks new uploads until it is paid.","kind":"decision"},{"label":"Upload and approve","detail":"Client uploads feedback and approves the current milestone.","kind":"outcome"}]}',
  '# Client portal redesign

## Goal
Give Northwind clients one place to follow a project and approve work, without email threads.

## Scope
- Magic-link sign-in, no passwords
- Project overview with recent files and an activity feed
- Milestone approval with a short comment
- Invoice list and payment method on file

## Out of scope
- Editing project scope
- Chat with the delivery team
- Roles beyond owner and viewer

## Open questions
- Who signs off on milestone approvals?
- Is one Stripe customer per client enough?

## Milestones
1. Sign-in and project list — 1 week
2. Milestone approval — 1 week
3. Billing screens — 1 week',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 10800000)
);

INSERT OR REPLACE INTO blueprint_evidence (id, blueprint_id, kind, content, summary, status, created_at)
VALUES (
  'seed-blueprint-evidence-1',
  'seed-blueprint-1',
  'text',
  'Kickoff notes: they lose track of approvals in email, and invoices go out manually at the end of the month. Two people on their side need access, three on ours.',
  'Approvals and invoices currently live in email.',
  'ready',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000)
);

INSERT OR REPLACE INTO blueprint_evidence (id, blueprint_id, kind, content, summary, status, created_at)
VALUES (
  'seed-blueprint-evidence-2',
  'seed-blueprint-1',
  'text',
  'Follow-up call: pricing is a flat retainer, so the portal must not show hourly rates. They do want to see what is included in the current month.',
  'Flat retainer, no hourly rates in the UI.',
  'ready',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 432000000)
);

INSERT OR REPLACE INTO blueprint_requirement (id, blueprint_id, area, text, status, confidence, source_evidence_ids, enabled, sort_order, created_at)
VALUES (
  'seed-blueprint-req-1',
  'seed-blueprint-1',
  'Access',
  'Clients sign in with a magic link sent to their work email.',
  'clear',
  'high',
  '["seed-blueprint-evidence-1"]',
  1,
  0,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000)
);

INSERT OR REPLACE INTO blueprint_requirement (id, blueprint_id, area, text, status, confidence, source_evidence_ids, enabled, sort_order, created_at)
VALUES (
  'seed-blueprint-req-2',
  'seed-blueprint-1',
  'Billing',
  'Invoices list the current month at the flat retainer rate, with no hourly breakdown.',
  'clear',
  'high',
  '["seed-blueprint-evidence-2"]',
  1,
  1,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000)
);

INSERT OR REPLACE INTO blueprint_requirement (id, blueprint_id, area, text, status, confidence, source_evidence_ids, enabled, sort_order, created_at)
VALUES (
  'seed-blueprint-req-3',
  'seed-blueprint-1',
  'Approvals',
  'A milestone is approved with one click plus an optional comment.',
  'ambiguous',
  'medium',
  '["seed-blueprint-evidence-1"]',
  1,
  2,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000)
);

INSERT OR REPLACE INTO blueprint_requirement (id, blueprint_id, area, text, status, confidence, source_evidence_ids, enabled, sort_order, created_at)
VALUES (
  'seed-blueprint-req-4',
  'seed-blueprint-1',
  'Roles',
  'Two client seats and three internal seats, with owner and viewer roles.',
  'clear',
  'medium',
  '["seed-blueprint-evidence-1"]',
  1,
  3,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000)
);

INSERT OR REPLACE INTO blueprint_requirement (id, blueprint_id, area, text, status, confidence, source_evidence_ids, enabled, sort_order, created_at)
VALUES (
  'seed-blueprint-req-5',
  'seed-blueprint-1',
  'Notifications',
  'Clients get an email when a milestone is ready for approval or an invoice is issued.',
  'missing',
  'low',
  '[]',
  0,
  4,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000)
);

INSERT OR REPLACE INTO blueprint_question (id, blueprint_id, text, rationale, gap, status, kind, options, answer, answered_at, created_at)
VALUES (
  'seed-blueprint-q-1',
  'seed-blueprint-1',
  'Which billing provider should the portal use?',
  'Invoice screens cannot be scoped without knowing who issues invoices and stores the payment method.',
  'Billing provider was never named.',
  'answered',
  'select',
  '["Stripe","Paddle","Manual invoices"]',
  'Stripe, because the existing invoices already live there.',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 43200000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000)
);

INSERT OR REPLACE INTO blueprint_question (id, blueprint_id, text, rationale, gap, status, kind, options, answer, answered_at, created_at)
VALUES (
  'seed-blueprint-q-2',
  'seed-blueprint-1',
  'Who signs off on a milestone approval?',
  'The approval screen needs to know whether one client contact is enough or both must accept.',
  'Sign-off rule is unknown.',
  'open',
  'short',
  NULL,
  NULL,
  NULL,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000)
);

-- Incident --------------------------------------------------------------------

INSERT OR REPLACE INTO incident (id, user_id, title, status, summary, created_at, updated_at)
VALUES (
  'seed-incident-1',
  (SELECT id FROM seed_target),
  'Checkout 502s after deploy',
  'closed',
  'v2.41.0 renamed the cart cache key. Old keys expired mid-session and payment-gateway calls failed for 14 minutes until rollback.',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 172800000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 14400000)
);

INSERT OR REPLACE INTO incident_evidence (id, incident_id, kind, source, content, occurred_at, time_source, summary, status, created_at)
VALUES (
  'seed-incident-evidence-1',
  'seed-incident-1',
  'log',
  'upload',
  '[14:30:02] deploy checkout-api v2.41.0 finished, rollout 100%
[14:32:07] GET /cart 502 upstream connect error (x14) from payment-gateway
[14:36:11] p99 latency 4.8s, baseline 180ms
[14:40:26] rollback to v2.40.3 started
[14:44:02] rollback complete, errors stop
[14:47:10] p99 back to 190ms with no further change',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169200000),
  'log',
  'Deploy at 14:30, 502s start at 14:32, rollback at 14:40 clears them.',
  'ready',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169200000)
);

INSERT OR REPLACE INTO incident_evidence (id, incident_id, kind, source, content, occurred_at, time_source, summary, status, created_at)
VALUES (
  'seed-incident-evidence-2',
  'seed-incident-1',
  'text',
  'user',
  'Deploy note: checkout-api v2.41.0 shipped at 14:30. It replaced the cart cache key (cart:v2 to cart:v3) and adjusted payment retries. No feature flags and no config changes went out with it.',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169100000),
  'user',
  'Cache key renamed in the same deploy; no flags or config changes.',
  'ready',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169100000)
);

INSERT OR REPLACE INTO incident_event (id, incident_id, occurred_at, time_source, description, confidence, source_evidence_ids, sort_order, created_at)
VALUES (
  'seed-incident-event-1',
  'seed-incident-1',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169200000),
  'log',
  'checkout-api v2.41.0 rolls out to 100% of traffic.',
  'high',
  '["seed-incident-evidence-1"]',
  0,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169100000)
);

INSERT OR REPLACE INTO incident_event (id, incident_id, occurred_at, time_source, description, confidence, source_evidence_ids, sort_order, created_at)
VALUES (
  'seed-incident-event-2',
  'seed-incident-1',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169080000),
  'log',
  'GET /cart starts returning 502 upstream connect errors from payment-gateway.',
  'high',
  '["seed-incident-evidence-1"]',
  1,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169100000)
);

INSERT OR REPLACE INTO incident_event (id, incident_id, occurred_at, time_source, description, confidence, source_evidence_ids, sort_order, created_at)
VALUES (
  'seed-incident-event-3',
  'seed-incident-1',
  NULL,
  'inferred',
  'Cart cache keys renamed in the deploy, so in-flight sessions miss the cache and rebuild it from scratch.',
  'medium',
  '["seed-incident-evidence-2"]',
  2,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169100000)
);

INSERT OR REPLACE INTO incident_event (id, incident_id, occurred_at, time_source, description, confidence, source_evidence_ids, sort_order, created_at)
VALUES (
  'seed-incident-event-4',
  'seed-incident-1',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 168960000),
  'log',
  'p99 latency reaches 4.8 seconds against a 180ms baseline.',
  'high',
  '["seed-incident-evidence-1"]',
  3,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169100000)
);

INSERT OR REPLACE INTO incident_event (id, incident_id, occurred_at, time_source, description, confidence, source_evidence_ids, sort_order, created_at)
VALUES (
  'seed-incident-event-5',
  'seed-incident-1',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 168720000),
  'log',
  'Rollback to v2.40.3 completes; errors stop and p99 returns to 190ms.',
  'high',
  '["seed-incident-evidence-1"]',
  4,
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 169100000)
);

INSERT OR REPLACE INTO incident_question (id, incident_id, text, rationale, gap, status, kind, options, answer, answered_at, created_at)
VALUES (
  'seed-incident-q-1',
  'seed-incident-1',
  'Did v2.41.0 change anything about the cart cache?',
  'The timeline shows a deploy followed immediately by cache-heavy endpoints failing, but no artifact confirms what the deploy changed.',
  'Deploy contents are not in the evidence.',
  'answered',
  'short',
  NULL,
  'Yes. It renamed the cache key from cart:v2 to cart:v3, so every in-flight session rebuilt its entry at once.',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 151200000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 158400000)
);

INSERT OR REPLACE INTO incident_analysis (id, incident_id, outcome, root_cause, confidence, supporting_event_ids, alternatives, postmortem, status, approved_at, created_at, updated_at)
VALUES (
  'seed-incident-analysis-1',
  'seed-incident-1',
  'proposed',
  'v2.41.0 renamed the cart cache key. Every active session missed the cache at the same moment, and the resulting rebuild storm saturated payment-gateway calls, which surfaced as 502s on GET /cart.',
  'high',
  '["seed-incident-event-1","seed-incident-event-2","seed-incident-event-3","seed-incident-event-5"]',
  '[{"text":"payment-gateway outage","whyRejected":"Errors stop at the rollback, not when the gateway recovers, and the log shows upstream connects failing only for cart traffic."},{"text":"Traffic spike","whyRejected":"Request volume stayed flat across the window in the deploy log."}]',
  '# Checkout 502s after deploy

## Impact
Cart reads failed for 14 minutes (14:32-14:46). Checkout attempts returned 502 to roughly 900 sessions; no payments were double-charged.

## Root cause
v2.41.0 renamed the cart cache key from `cart:v2` to `cart:v3`. Every active session missed the cache at once, and the rebuild storm saturated calls to payment-gateway.

## Detection
Error-rate alert on checkout fired at 14:33.

## Response
Rolled back to v2.40.3 at 14:40; errors stopped by 14:44.

## Follow-ups
1. Warm the new cache key before cutover.
2. Fail deploys that rename a cache namespace without a migration step.
3. Add a cart-cache-hit-rate panel to the checkout dashboard.',
  'approved',
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 140400000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 144000000),
  (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 140400000)
);

-- Usage meter ----------------------------------------------------------------

INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-1', (SELECT id FROM seed_target), 'chat', 'muse-spark-1.3', 1820, 640, 657, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 604800000));
INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-2', (SELECT id FROM seed_target), 'incident', 'muse-spark-1.3', 9400, 1800, 2490, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 518400000));
INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-3', (SELECT id FROM seed_target), 'blueprint', 'muse-spark-1.3', 12100, 2600, 3375, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 432000000));
INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-4', (SELECT id FROM seed_target), 'measure', 'sam-3.1', 0, 0, 1000, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 345600000));
INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-5', (SELECT id FROM seed_target), 'voice', 'muse-voice-transcribe-1.0', 0, 0, 100, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 259200000));
INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-6', (SELECT id FROM seed_target), 'chat', 'muse-spark-1.3', 2400, 900, 900, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 172800000));
INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-7', (SELECT id FROM seed_target), 'ui', 'muse-spark-1.3', 7600, 1400, 1980, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 86400000));
INSERT OR REPLACE INTO usage_event (id, user_id, feature, model, input_tokens, output_tokens, cost_micros, created_at)
VALUES ('seed-usage-8', (SELECT id FROM seed_target), 'chat', 'muse-spark-1.3', 3100, 1150, 1155, (CAST(unixepoch('subsecond') * 1000 AS INTEGER) - 7200000));
