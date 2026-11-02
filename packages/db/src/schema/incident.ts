import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text, uniqueIndex } from 'drizzle-orm/sqlite-core'

import { user } from './auth'

const createdAt = integer('created_at', { mode: 'timestamp_ms' })
  .notNull()
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)

export const incident = sqliteTable(
  'incident',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    status: text('status').$type<'open' | 'closed'>().notNull().default('open'),
    summary: text('summary'),
    createdAt,
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  },
  (table) => [index('incident_userId_idx').on(table.userId, table.updatedAt)]
)

export const incidentEvidence = sqliteTable(
  'incident_evidence',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incident.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<'screenshot' | 'log' | 'text' | 'voice' | 'answer'>().notNull(),
    source: text('source').$type<'upload' | 'user'>().notNull().default('upload'),
    content: text('content'),
    imageKey: text('image_key'),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }),
    timeSource: text('time_source').$type<'log' | 'screenshot' | 'user' | 'inferred'>(),
    timeNote: text('time_note'),
    summary: text('summary'),
    status: text('status').$type<'pending' | 'ready' | 'error'>().notNull().default('pending'),
    error: text('error'),
    createdAt
  },
  (table) => [index('incident_evidence_incidentId_idx').on(table.incidentId, table.createdAt)]
)

export const incidentEvent = sqliteTable(
  'incident_event',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incident.id, { onDelete: 'cascade' }),
    occurredAt: integer('occurred_at', { mode: 'timestamp_ms' }),
    timeSource: text('time_source').$type<'log' | 'screenshot' | 'user' | 'inferred'>(),
    description: text('description').notNull(),
    confidence: text('confidence').$type<'low' | 'medium' | 'high'>().notNull(),
    sourceEvidenceIds: text('source_evidence_ids', { mode: 'json' })
      .$type<Array<string>>()
      .notNull(),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt
  },
  (table) => [index('incident_event_incidentId_idx').on(table.incidentId, table.sortOrder)]
)

export const incidentQuestion = sqliteTable(
  'incident_question',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incident.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    rationale: text('rationale').notNull(),
    gap: text('gap').notNull(),
    status: text('status').$type<'open' | 'answered' | 'dismissed'>().notNull().default('open'),
    kind: text('kind').$type<'short' | 'long' | 'select' | 'date'>().notNull().default('short'),
    options: text('options', { mode: 'json' }).$type<Array<string>>(),
    answer: text('answer'),
    answeredAt: integer('answered_at', { mode: 'timestamp_ms' }),
    createdAt
  },
  (table) => [index('incident_question_incidentId_idx').on(table.incidentId, table.status)]
)

export const incidentAnalysis = sqliteTable(
  'incident_analysis',
  {
    id: text('id').primaryKey(),
    incidentId: text('incident_id')
      .notNull()
      .references(() => incident.id, { onDelete: 'cascade' }),
    outcome: text('outcome').$type<'proposed' | 'inconclusive'>().notNull(),
    rootCause: text('root_cause').notNull(),
    confidence: text('confidence').$type<'low' | 'medium' | 'high'>().notNull(),
    supportingEventIds: text('supporting_event_ids', { mode: 'json' })
      .$type<Array<string>>()
      .notNull(),
    alternatives: text('alternatives', { mode: 'json' })
      .$type<Array<{ text: string; whyRejected: string }>>()
      .notNull(),
    postmortem: text('postmortem'),
    status: text('status').$type<'draft' | 'approved'>().notNull().default('draft'),
    approvedAt: integer('approved_at', { mode: 'timestamp_ms' }),
    createdAt,
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  },
  (table) => [uniqueIndex('incident_analysis_incidentId_idx').on(table.incidentId)]
)

export type IncidentInsert = typeof incident.$inferInsert
export type IncidentSelect = typeof incident.$inferSelect
export type IncidentEvidenceInsert = typeof incidentEvidence.$inferInsert
export type IncidentEvidenceSelect = typeof incidentEvidence.$inferSelect
export type IncidentEventInsert = typeof incidentEvent.$inferInsert
export type IncidentEventSelect = typeof incidentEvent.$inferSelect
export type IncidentQuestionInsert = typeof incidentQuestion.$inferInsert
export type IncidentQuestionSelect = typeof incidentQuestion.$inferSelect
export type IncidentAnalysisInsert = typeof incidentAnalysis.$inferInsert
export type IncidentAnalysisSelect = typeof incidentAnalysis.$inferSelect
