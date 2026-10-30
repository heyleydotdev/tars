import { sql } from 'drizzle-orm'
import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core'

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
