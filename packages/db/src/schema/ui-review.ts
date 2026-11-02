import { sql } from 'drizzle-orm'
import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth'

const createdAt = integer('created_at', { mode: 'timestamp_ms' })
  .notNull()
  .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)

export const uiReview = sqliteTable(
  'ui_review',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    title: text('title'),
    imageKey: text('image_key').notNull(),
    summary: text('summary'),
    platform: text('platform').$type<'mobile' | 'web' | 'desktop' | 'unknown'>(),
    status: text('status').$type<'created' | 'explained'>().notNull().default('created'),
    createdAt,
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  },
  (table) => [index('ui_review_userId_idx').on(table.userId, table.updatedAt)]
)

export const uiFinding = sqliteTable(
  'ui_finding',
  {
    id: text('id').primaryKey(),
    reviewId: text('review_id')
      .notNull()
      .references(() => uiReview.id, { onDelete: 'cascade' }),
    label: text('label').notNull(),
    description: text('description').notNull(),
    redesignHint: text('redesign_hint'),
    severity: text('severity').$type<'minor' | 'moderate' | 'significant'>().notNull(),
    included: integer('included').notNull().default(1),
    sortOrder: integer('sort_order').notNull().default(0),
    createdAt
  },
  (table) => [index('ui_finding_reviewId_idx').on(table.reviewId, table.sortOrder)]
)

export const uiVariant = sqliteTable(
  'ui_variant',
  {
    id: text('id').primaryKey(),
    reviewId: text('review_id')
      .notNull()
      .references(() => uiReview.id, { onDelete: 'cascade' }),
    imageKey: text('image_key').notNull(),
    prompt: text('prompt').notNull(),
    instruction: text('instruction'),
    findings: text('findings', { mode: 'json' }).$type<Array<string>>().notNull(),
    createdAt
  },
  (table) => [index('ui_variant_reviewId_idx').on(table.reviewId, table.createdAt)]
)

export type UiReviewSelect = typeof uiReview.$inferSelect
export type UiReviewInsert = typeof uiReview.$inferInsert
export type UiFindingSelect = typeof uiFinding.$inferSelect
export type UiFindingInsert = typeof uiFinding.$inferInsert
export type UiVariantSelect = typeof uiVariant.$inferSelect
export type UiVariantInsert = typeof uiVariant.$inferInsert
