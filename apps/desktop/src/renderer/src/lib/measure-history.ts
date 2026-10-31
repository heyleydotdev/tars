import type { MeasureHistoryDetailOutput } from '@tars/core/schemas/measure'
import type { MeasureUnit } from '@tars/core/utils/format'
import { ERRORS } from '@tars/core/errors'

import type { MeasureBatchItem } from './measure'
import { blobToDataUrl, createMeasureThumbnail, dataUrlToBlob } from './measure'
import { orpc } from './orpc'

async function uploadImage(itemId: string, variant: 'full' | 'thumb', blob: Blob): Promise<void> {
  await orpc.measure.history.upload.call({
    itemId,
    variant,
    file: new File([blob], `${itemId}-${variant}.jpg`, {
      type: blob.type || 'image/jpeg'
    })
  })
}

async function fetchImage(itemId: string, variant: 'full' | 'thumb'): Promise<Blob> {
  const stream = await orpc.measure.history.image.call({ itemId, variant })

  return new Response(stream, {
    headers: { 'content-type': 'image/jpeg' }
  }).blob()
}

function historyItem(item: MeasureBatchItem, id: string) {
  return {
    id,
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
  const uploadItems = items.map((item) => ({ item, id: crypto.randomUUID() }))
  let runId: string | null = null

  try {
    const begin = await orpc.measure.history.begin.call({
      referenceId,
      referenceLabel: result.reference.label,
      referencePrompt: result.reference.prompt,
      referenceWidthMm: result.reference.widthMm,
      referenceHeightMm: result.reference.heightMm,
      prompts,
      unit,
      coverThumb,
      items: uploadItems.map(({ item, id }) => historyItem(item, id))
    })

    runId = begin.runId

    for (const { item, id } of uploadItems) {
      await uploadImage(id, 'full', dataUrlToBlob(item.photo.dataUrl))
      await uploadImage(id, 'thumb', await createMeasureThumbnail(item.photo))
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

export async function loadMeasureRun(id: string): Promise<{
  detail: MeasureHistoryDetailOutput
  photos: Record<string, string>
}> {
  const detail = await orpc.measure.history.get.call({ id })
  const photos = await Promise.all(
    detail.items.map(async (item) => {
      const blob = await fetchImage(item.id, 'full')

      return [item.id, await blobToDataUrl(blob)] as const
    })
  )

  return { detail, photos: Object.fromEntries(photos) }
}

export async function deleteMeasureRun(id: string): Promise<void> {
  await orpc.measure.history.remove.call({ id })
}
