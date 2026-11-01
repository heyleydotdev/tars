import type {
  MeasureHistoryBeginOutput,
  MeasureHistoryDetailOutput,
  MeasureHistoryListOutput,
  MeasureResultOutput,
  MeasureUnit
} from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'
import { measureHistoryIdSchema, measureHistorySaveSchema } from '@tars/core/schemas/measure'
import { deleteFiles, signFileKey } from '@tars/core/services/files'
import { fileKey, signedFilePath } from '@tars/core/utils/files'
import { measureRun, measureRunItem } from '@tars/db/schema'
import { and, desc, eq } from '@tars/db/sql'

import { protectedProcedure } from '../context'
import { InternalServerError, NotFoundError } from '../errors'

function measureFileKeys(userId: string, runId: string, itemId: string) {
  return {
    imageKey: fileKey('measure', userId, runId, `${itemId}.jpg`),
    thumbKey: fileKey('measure', userId, runId, `${itemId}-thumb.jpg`)
  }
}

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

      const rows = await context.db
        .select({
          id: measureRunItem.id,
          name: measureRunItem.name,
          status: measureRunItem.status,
          error: measureRunItem.error,
          imageWidth: measureRunItem.imageWidth,
          imageHeight: measureRunItem.imageHeight,
          result: measureRunItem.result,
          imageKey: measureRunItem.imageKey,
          thumbKey: measureRunItem.thumbKey
        })
        .from(measureRunItem)
        .where(eq(measureRunItem.runId, input.id))
        .orderBy(measureRunItem.sortOrder)

      const items = await Promise.all(
        rows.map(async ({ imageKey, thumbKey, ...item }) => ({
          ...item,
          result: item.result as MeasureResultOutput | null,
          imageUrl: signedFilePath(imageKey, await signFileKey(context.fileSecret, imageKey)),
          thumbUrl: signedFilePath(thumbKey, await signFileKey(context.fileSecret, thumbKey))
        }))
      )

      return {
        ...run,
        unit: run.unit as MeasureUnit,
        createdAt: run.createdAt.toISOString(),
        items
      }
    }),

  begin: protectedProcedure
    .input(measureHistorySaveSchema)
    .handler(async ({ input, context }): Promise<MeasureHistoryBeginOutput> => {
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
          ...measureFileKeys(userId, runId, item.id)
        }))
      )

      return {
        runId,
        items: input.items.map((item) => ({
          itemId: item.id,
          ...measureFileKeys(userId, runId, item.id)
        }))
      }
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
          await deleteFiles(context.files, keys)
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
