import { sql } from 'drizzle-orm'
import { index, integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

import { user } from './auth'

export const measureReference = sqliteTable('measure_reference', {
  id: text('id').primaryKey(),
  userId: text('user_id').references(() => user.id, { onDelete: 'cascade' }),
  label: text('label').notNull(),
  prompt: text('prompt').notNull(),
  widthMm: real('width_mm').notNull(),
  heightMm: real('height_mm').notNull(),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: integer('created_at', { mode: 'timestamp_ms' })
    .notNull()
    .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
})

export type MeasureReferenceInsert = typeof measureReference.$inferInsert
export type MeasureReferenceSelect = typeof measureReference.$inferSelect

export const measureRun = sqliteTable(
  'measure_run',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    referenceId: text('reference_id'),
    referenceLabel: text('reference_label').notNull(),
    referencePrompt: text('reference_prompt').notNull(),
    referenceWidthMm: real('reference_width_mm').notNull(),
    referenceHeightMm: real('reference_height_mm').notNull(),
    prompts: text('prompts', { mode: 'json' }).$type<Array<string>>().notNull(),
    unit: text('unit').notNull(),
    itemCount: integer('item_count').notNull(),
    measuredCount: integer('measured_count').notNull(),
    coverThumb: text('cover_thumb').notNull(),
    status: text('status').$type<'draft' | 'ready'>().notNull().default('draft'),
    createdAt: integer('created_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`),
    updatedAt: integer('updated_at', { mode: 'timestamp_ms' })
      .notNull()
      .default(sql`(cast(unixepoch('subsecond') * 1000 as integer))`)
  },
  (table) => [index('measure_run_user_status_idx').on(table.userId, table.status, table.createdAt)]
)

export const measureRunItem = sqliteTable(
  'measure_run_item',
  {
    id: text('id').primaryKey(),
    runId: text('run_id')
      .notNull()
      .references(() => measureRun.id, { onDelete: 'cascade' }),
    name: text('name').notNull(),
    sortOrder: integer('sort_order').notNull(),
    status: text('status').$type<'idle' | 'done' | 'error'>().notNull(),
    error: text('error'),
    imageWidth: integer('image_width').notNull(),
    imageHeight: integer('image_height').notNull(),
    result: text('result', { mode: 'json' }).$type<Record<string, unknown> | null>(),
    imageKey: text('image_key').notNull(),
    thumbKey: text('thumb_key').notNull()
  },
  (table) => [index('measure_run_item_runId_idx').on(table.runId)]
)

export type MeasureRunInsert = typeof measureRun.$inferInsert
export type MeasureRunSelect = typeof measureRun.$inferSelect
export type MeasureRunItemInsert = typeof measureRunItem.$inferInsert
export type MeasureRunItemSelect = typeof measureRunItem.$inferSelect
