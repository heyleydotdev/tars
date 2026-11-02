import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth'

const createdAt = integer('created_at', { mode: 'timestamp_ms' })
  .notNull()
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)

export const blueprint = sqliteTable(
  'blueprint',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    client: text('client'),
    status: text('status')
      .$type<'intake' | 'mapped' | 'ready' | 'drafted'>()
      .notNull()
      .default('intake'),
    summary: text('summary'),
    draft: text('draft'),
    createdAt,
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  },
  (table) => [index('blueprint_userId_idx').on(table.userId, table.updatedAt)]
)

export const blueprintEvidence = sqliteTable(
  'blueprint_evidence',
  {
    id: text('id').primaryKey(),
    blueprintId: text('blueprint_id')
      .notNull()
      .references(() => blueprint.id, { onDelete: 'cascade' }),
    kind: text('kind').$type<'text' | 'screenshot' | 'voice' | 'answer'>().notNull(),
    content: text('content'),
    summary: text('summary'),
    imageKey: text('image_key'),
    status: text('status').$type<'pending' | 'ready' | 'error'>().notNull().default('ready'),
    error: text('error'),
    createdAt
  },
  (table) => [index('blueprint_evidence_blueprintId_idx').on(table.blueprintId, table.createdAt)]
)

export const blueprintRequirement = sqliteTable(
  'blueprint_requirement',
  {
    id: text('id').primaryKey(),
    blueprintId: text('blueprint_id')
      .notNull()
      .references(() => blueprint.id, { onDelete: 'cascade' }),
    area: text('area').notNull(),
    text: text('text').notNull(),
    status: text('status').$type<'clear' | 'ambiguous' | 'missing' | 'suggested'>().notNull(),
    confidence: text('confidence').$type<'low' | 'medium' | 'high'>().notNull(),
    sourceEvidenceIds: text('source_evidence_ids', { mode: 'json' })
      .$type<Array<string>>()
      .notNull(),
    enabled: integer('enabled', { mode: 'boolean' }).notNull().default(true),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt
  },
  (table) => [index('blueprint_requirement_blueprintId_idx').on(table.blueprintId, table.sortOrder)]
)

export const blueprintQuestion = sqliteTable(
  'blueprint_question',
  {
    id: text('id').primaryKey(),
    blueprintId: text('blueprint_id')
      .notNull()
      .references(() => blueprint.id, { onDelete: 'cascade' }),
    text: text('text').notNull(),
    rationale: text('rationale').notNull(),
    gap: text('gap').notNull(),
    status: text('status').$type<'open' | 'answered' | 'dismissed'>().notNull().default('open'),
    answer: text('answer'),
    answeredAt: integer('answered_at', { mode: 'timestamp_ms' }),
    createdAt
  },
  (table) => [index('blueprint_question_blueprintId_idx').on(table.blueprintId, table.createdAt)]
)

export type BlueprintSelect = typeof blueprint.$inferSelect
export type BlueprintInsert = typeof blueprint.$inferInsert
export type BlueprintEvidenceSelect = typeof blueprintEvidence.$inferSelect
export type BlueprintEvidenceInsert = typeof blueprintEvidence.$inferInsert
export type BlueprintRequirementSelect = typeof blueprintRequirement.$inferSelect
export type BlueprintRequirementInsert = typeof blueprintRequirement.$inferInsert
export type BlueprintQuestionSelect = typeof blueprintQuestion.$inferSelect
export type BlueprintQuestionInsert = typeof blueprintQuestion.$inferInsert
