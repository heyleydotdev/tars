import type {
  MeasureHistoryDetailOutput,
  MeasureHistoryListOutput,
  MeasureResultOutput
} from '@tars/core/schemas/measure'
import type { MeasureUnit } from '@tars/core/utils/format'
import { ERRORS } from '@tars/core/errors'
import {
  measureHistoryIdSchema,
  measureHistoryImageOutputSchema,
  measureHistoryImageSchema,
  measureHistorySaveSchema,
  measureHistoryUploadSchema
} from '@tars/core/schemas/measure'
import { measureRun, measureRunItem } from '@tars/db/schema'
import { and, desc, eq } from '@tars/db/sql'

import { protectedProcedure } from '../context'
import { BadRequestError, InternalServerError, NotFoundError } from '../errors'

const summaryColumns = {
  id: measureRun.id,
  referenceLabel: measureRun.referenceLabel,
  prompts: measureRun.prompts,
  unit: measureRun.unit,
  itemCount: measureRun.itemCount,
  measuredCount: measureRun.measuredCount,
  coverThumb: measureRun.coverThumb,
  createdAt: measureRun.createdAt
}

export const measureHistoryRouter = {
  list: protectedProcedure.handler(async ({ context }): Promise<MeasureHistoryListOutput> => {
    const runs = await context.db
      .select(summaryColumns)
      .from(measureRun)
      .where(and(eq(measureRun.userId, context.session.user.id), eq(measureRun.status, 'ready')))
      .orderBy(desc(measureRun.createdAt))
      .limit(50)

    return {
      items: runs.map((run) => ({
        ...run,
        unit: run.unit as MeasureUnit,
        createdAt: run.createdAt.toISOString()
      }))
    }
  }),

  get: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(measureHistoryIdSchema)
    .handler(async ({ input, context, errors }): Promise<MeasureHistoryDetailOutput> => {
      const [run] = await context.db
        .select({
          ...summaryColumns,
          referenceId: measureRun.referenceId,
          referencePrompt: measureRun.referencePrompt,
          referenceWidthMm: measureRun.referenceWidthMm,
          referenceHeightMm: measureRun.referenceHeightMm
        })
        .from(measureRun)
        .where(
          and(
            eq(measureRun.id, input.id),
            eq(measureRun.userId, context.session.user.id),
            eq(measureRun.status, 'ready')
          )
        )
        .limit(1)

      if (!run) throw errors.NOT_FOUND()

      const items = await context.db
        .select({
          id: measureRunItem.id,
          name: measureRunItem.name,
          status: measureRunItem.status,
          error: measureRunItem.error,
          imageWidth: measureRunItem.imageWidth,
          imageHeight: measureRunItem.imageHeight,
          result: measureRunItem.result
        })
        .from(measureRunItem)
        .where(eq(measureRunItem.runId, input.id))
        .orderBy(measureRunItem.sortOrder)

      return {
        ...run,
        unit: run.unit as MeasureUnit,
        createdAt: run.createdAt.toISOString(),
        items: items.map((item) => ({
          ...item,
          result: item.result as MeasureResultOutput | null
        }))
      }
    }),

  upload: protectedProcedure
    .errors({ BAD_REQUEST: BadRequestError, NOT_FOUND: NotFoundError })
    .input(measureHistoryUploadSchema)
    .handler(async ({ input, context, errors }): Promise<void> => {
      const userId = context.session.user.id
      const [item] = await context.db
        .select({ imageKey: measureRunItem.imageKey, thumbKey: measureRunItem.thumbKey })
        .from(measureRunItem)
        .innerJoin(measureRun, eq(measureRun.id, measureRunItem.runId))
        .where(and(eq(measureRunItem.id, input.itemId), eq(measureRun.userId, userId)))
        .limit(1)

      if (!item) throw errors.NOT_FOUND()

      if (!input.file.type.startsWith('image/')) {
        throw errors.BAD_REQUEST({ message: ERRORS.imageTypeInvalid })
      }

      if (input.file.size > 25 * 1024 * 1024) {
        throw errors.BAD_REQUEST({ message: ERRORS.imageTooLarge })
      }

      const key = input.variant === 'thumb' ? item.thumbKey : item.imageKey

      await context.measureImages.put(key, input.file.stream(), {
        httpMetadata: { contentType: input.file.type }
      })
    }),

  image: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(measureHistoryImageSchema)
    .output(measureHistoryImageOutputSchema)
    .handler(async ({ input, context, errors }): Promise<ReadableStream> => {
      const userId = context.session.user.id
      const [item] = await context.db
        .select({ imageKey: measureRunItem.imageKey, thumbKey: measureRunItem.thumbKey })
        .from(measureRunItem)
        .innerJoin(measureRun, eq(measureRun.id, measureRunItem.runId))
        .where(and(eq(measureRunItem.id, input.itemId), eq(measureRun.userId, userId)))
        .limit(1)

      if (!item) throw errors.NOT_FOUND()

      const key = input.variant === 'thumb' ? item.thumbKey : item.imageKey
      const object = await context.measureImages.get(key)

      if (!object) throw errors.NOT_FOUND()

      context.resHeaders?.set('content-type', object.httpMetadata?.contentType ?? 'image/jpeg')
      context.resHeaders?.set('cache-control', 'private, max-age=3600')

      return object.body
    }),

  begin: protectedProcedure
    .input(measureHistorySaveSchema)
    .handler(async ({ input, context }): Promise<{ runId: string }> => {
      const userId = context.session.user.id
      const runId = crypto.randomUUID()
      const measuredCount = input.items.filter((item) => item.status === 'done').length

      await context.db.insert(measureRun).values({
        id: runId,
        userId,
        referenceId: input.referenceId,
        referenceLabel: input.referenceLabel,
        referencePrompt: input.referencePrompt,
        referenceWidthMm: input.referenceWidthMm,
        referenceHeightMm: input.referenceHeightMm,
        prompts: input.prompts,
        unit: input.unit,
        itemCount: input.items.length,
        measuredCount,
        coverThumb: input.coverThumb,
        status: 'draft'
      })

      await context.db.insert(measureRunItem).values(
        input.items.map((item, index) => ({
          id: item.id,
          runId,
          name: item.name,
          sortOrder: index,
          status: item.status,
          error: item.error,
          imageWidth: item.imageWidth,
          imageHeight: item.imageHeight,
          result: item.result,
          imageKey: `measure/${userId}/${runId}/${item.id}.jpg`,
          thumbKey: `measure/${userId}/${runId}/${item.id}-thumb.jpg`
        }))
      )

      return { runId }
    }),

  complete: protectedProcedure
    .errors({ NOT_FOUND: NotFoundError })
    .input(measureHistoryIdSchema)
    .handler(async ({ input, context, errors }): Promise<void> => {
      const [run] = await context.db
        .update(measureRun)
        .set({ status: 'ready', updatedAt: new Date() })
        .where(and(eq(measureRun.id, input.id), eq(measureRun.userId, context.session.user.id)))
        .returning({ id: measureRun.id })

      if (!run) throw errors.NOT_FOUND()
    }),

  remove: protectedProcedure
    .errors({ INTERNAL_SERVER_ERROR: InternalServerError, NOT_FOUND: NotFoundError })
    .input(measureHistoryIdSchema)
    .handler(async ({ input, context, errors }): Promise<void> => {
      const [run] = await context.db
        .select({ id: measureRun.id })
        .from(measureRun)
        .where(and(eq(measureRun.id, input.id), eq(measureRun.userId, context.session.user.id)))
        .limit(1)

      if (!run) throw errors.NOT_FOUND()

      const items = await context.db
        .select({ imageKey: measureRunItem.imageKey, thumbKey: measureRunItem.thumbKey })
        .from(measureRunItem)
        .where(eq(measureRunItem.runId, input.id))
      const keys = items.flatMap((item) => [item.imageKey, item.thumbKey])

      if (keys.length > 0) {
        try {
          await context.measureImages.delete(keys)
        } catch {
          throw errors.INTERNAL_SERVER_ERROR({
            message: ERRORS.historyDeleteFailed
          })
        }
      }

      await context.db
        .delete(measureRun)
        .where(and(eq(measureRun.id, input.id), eq(measureRun.userId, context.session.user.id)))
    })
}
