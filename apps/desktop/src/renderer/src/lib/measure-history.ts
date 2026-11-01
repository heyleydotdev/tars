import { useInfiniteQuery } from '@tanstack/react-query'

import type { MeasureSavedOutput, MeasureUnit } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'

import type { MeasureBatchItem } from './measure'
import { fileSrc, uploadFile } from './files'
import { blobToDataUrl, createMeasureThumbnail, dataUrlToBlob } from './measure'
import { orpc } from './orpc'

const PAGE_SIZE = 12

export const measureSavedKey = ['measure', 'saved'] as const

function historyItem(item: MeasureBatchItem) {
  return {
    id: item.id,
    name: item.photo.name,
    status:
      item.status === 'done'
        ? ('done' as const)
        : item.status === 'error'
          ? ('error' as const)
          : ('idle' as const),
    error: item.error,
    imageWidth: item.photo.width,
    imageHeight: item.photo.height,
    result: item.result
  }
}

export function useSavedMeasures() {
  return useInfiniteQuery({
    queryKey: measureSavedKey,
    queryFn: ({ pageParam }) =>
      orpc.measure.saved.list.call({ cursor: pageParam, limit: PAGE_SIZE }),
    initialPageParam: null as string | null,
    getNextPageParam: (last) => last.nextCursor
  })
}

export async function saveMeasureRun(
  items: Array<MeasureBatchItem>,
  prompts: Array<string>,
  unit: MeasureUnit
): Promise<string> {
  const measured = items.find((item) => item.result)
  const result = measured?.result

  if (!measured || !result) throw new Error(ERRORS.historySaveFailed)

  const referenceId = measured.request?.referenceId ?? result.reference.id

  const thumbnail = await createMeasureThumbnail(measured.photo)
  const coverThumb = await blobToDataUrl(thumbnail)
  let runId: string | null = null

  try {
    const { runId: savedRunId, items: targets } = await orpc.measure.history.begin.call({
      referenceId,
      referenceLabel: result.reference.label,
      referencePrompt: result.reference.prompt,
      referenceWidthMm: result.reference.widthMm,
      referenceHeightMm: result.reference.heightMm,
      prompts,
      unit,
      coverThumb,
      items: items.map((item) => historyItem(item))
    })

    runId = savedRunId

    for (const item of items) {
      const target = targets.find((entry) => entry.itemId === item.id)

      if (!target) throw new Error(ERRORS.historySaveFailed)

      await uploadFile(target.imageKey, dataUrlToBlob(item.photo.dataUrl))
      await uploadFile(target.thumbKey, await createMeasureThumbnail(item.photo))
    }

    await orpc.measure.history.complete.call({ id: runId })

    return runId
  } catch (error) {
    if (runId) {
      await orpc.measure.history.remove.call({ id: runId }).catch(() => undefined)
    }

    throw error
  }
}

export async function updateSavedMeasures(items: Array<MeasureBatchItem>): Promise<void> {
  const updates = items.flatMap((item) =>
    item.result ? [{ id: item.id, result: item.result }] : []
  )

  if (updates.length === 0) return

  await orpc.measure.saved.update.call({ items: updates })
}

export async function removeSavedMeasure(id: string): Promise<void> {
  await orpc.measure.saved.remove.call({ id })
}

export async function fetchMeasureImage(url: string): Promise<string> {
  const response = await fetch(fileSrc(url))

  if (!response.ok) throw new Error(ERRORS.historyLoadFailed)

  return blobToDataUrl(await response.blob())
}

export function savedMeasureItem(measure: MeasureSavedOutput, dataUrl: string): MeasureBatchItem {
  return {
    id: measure.id,
    photo: {
      dataUrl,
      width: measure.imageWidth,
      height: measure.imageHeight,
      name: measure.name
    },
    status: measure.status,
    result: measure.result,
    error: measure.error,
    prompts: null,
    notice: null,
    request: measure.referenceId
      ? { referenceId: measure.referenceId, prompts: measure.prompts }
      : null
  }
}
