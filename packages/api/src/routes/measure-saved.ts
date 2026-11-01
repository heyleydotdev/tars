import type {
  MeasureResultOutput,
  MeasureSavedListOutput,
  MeasureUnit
} from '@tars/core/schemas/measure'
import {
  measureSavedIdSchema,
  measureSavedListInputSchema,
  measureSavedUpdateSchema
} from '@tars/core/schemas/measure'
import { deleteFiles, signFileKey } from '@tars/core/services/files'
import { signedFilePath } from '@tars/core/utils/files'
import { measureRun, measureRunItem } from '@tars/db/schema'
import { and, asc, desc, eq, gt, inArray, lt, or, sql } from '@tars/db/sql'

import { protectedProcedure } from '../context'
import { NotFoundError } from '../errors'

function decodeCursor(
  value: string | null
): { createdAt: Date; runId: string; sortOrder: number } | null {
  if (!value) return null

  const [time, runId, order] = value.split('|')
  const createdAt = new Date(Number(time))
  const sortOrder = Number(order)

  if (!runId || Number.isNaN(createdAt.getTime()) || Number.isNaN(sortOrder)) return null

  return { createdAt, runId, sortOrder }
}

function encodeCursor(row: { createdAt: Date; runId: string; sortOrder: number }): string {
  return `${row.createdAt.getTime()}|${row.runId}|${row.sortOrder}`
}

export const measureSavedRouter = {
  list: protectedProcedure
    .input(measureSavedListInputSchema)
    .handler(async ({ input, context }): Promise<MeasureSavedListOutput> => {
      const cursor = decodeCursor(input.cursor)
      const rows = await context.db
        .select({
          id: measureRunItem.id,
          runId: measureRun.id,
          name: measureRunItem.name,
          status: measureRunItem.status,
          error: measureRunItem.error,
          result: measureRunItem.result,
          imageWidth: measureRunItem.imageWidth,
          imageHeight: measureRunItem.imageHeight,
          imageKey: measureRunItem.imageKey,
          thumbKey: measureRunItem.thumbKey,
          sortOrder: measureRunItem.sortOrder,
          referenceId: measureRun.referenceId,
          referenceLabel: measureRun.referenceLabel,
          prompts: measureRun.prompts,
          unit: measureRun.unit,
          createdAt: measureRun.createdAt
        })
        .from(measureRunItem)
        .innerJoin(measureRun, eq(measureRun.id, measureRunItem.runId))
        .where(
          and(
            eq(measureRun.userId, context.session.user.id),
            eq(measureRun.status, 'ready'),
            cursor
              ? or(
                  lt(measureRun.createdAt, cursor.createdAt),
                  and(eq(measureRun.createdAt, cursor.createdAt), lt(measureRun.id, cursor.runId)),
                  and(
                    eq(measureRun.createdAt, cursor.createdAt),
                    eq(measureRun.id, cursor.runId),
                    gt(measureRunItem.sortOrder, cursor.sortOrder)
                  )
                )
              : undefined
          )
        )
        .orderBy(desc(measureRun.createdAt), desc(measureRun.id), asc(measureRunItem.sortOrder))
        .limit(input.limit + 1)
      const page = rows.slice(0, input.limit)
      const last = page.at(-1)
      const items = await Promise.all(
        page.map(async (row) => ({
          id: row.id,
          runId: row.runId,
          name: row.name,
          referenceId: row.referenceId,
          referenceLabel: row.referenceLabel,
          prompts: row.prompts,
          unit: row.unit as MeasureUnit,
          status: row.status,
          error: row.error,
          result: row.result as MeasureResultOutput | null,
          imageWidth: row.imageWidth,
          imageHeight: row.imageHeight,
          imageUrl: signedFilePath(
            row.imageKey,
            await signFileKey(context.fileSecret, row.imageKey)
          ),
          thumbUrl: signedFilePath(
            row.thumbKey,
            await signFileKey(context.fileSecret, row.thumbKey)
          ),
          createdAt: row.createdAt.toISOString()
        }))
      )

      return {
        items,
        nextCursor: rows.length > input.limit && last ? encodeCursor(last) : null
      }
    }),

  update: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(measureSavedUpdateSchema)
    .handler(async ({ input, context, errors }): Promise<void> => {
      const ids = input.items.map((item) => item.id)
      const owned = await context.db
        .select({ id: measureRunItem.id })
        .from(measureRunItem)
        .innerJoin(measureRun, eq(measureRun.id, measureRunItem.runId))
        .where(and(inArray(measureRunItem.id, ids), eq(measureRun.userId, context.session.user.id)))

      if (owned.length !== ids.length) throw errors.NOT_FOUND()

      for (const item of input.items) {
        await context.db
          .update(measureRunItem)
          .set({ result: item.result })
          .where(eq(measureRunItem.id, item.id))
      }
    }),

  remove: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(measureSavedIdSchema)
    .handler(async ({ input, context, errors }): Promise<void> => {
      const [row] = await context.db
        .select({
          id: measureRunItem.id,
          runId: measureRunItem.runId,
          imageKey: measureRunItem.imageKey,
          thumbKey: measureRunItem.thumbKey
        })
        .from(measureRunItem)
        .innerJoin(measureRun, eq(measureRun.id, measureRunItem.runId))
        .where(and(eq(measureRunItem.id, input.id), eq(measureRun.userId, context.session.user.id)))
        .limit(1)

      if (!row) throw errors.NOT_FOUND()

      await context.db.delete(measureRunItem).where(eq(measureRunItem.id, row.id))
      await deleteFiles(context.files, [row.imageKey, row.thumbKey])

      const [remaining] = await context.db
        .select({ count: sql<number>`count(*)` })
        .from(measureRunItem)
        .where(eq(measureRunItem.runId, row.runId))

      if (Number(remaining?.count ?? 0) === 0) {
        await context.db.delete(measureRun).where(eq(measureRun.id, row.runId))
      }
    })
}
