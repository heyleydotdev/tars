import { Zip, ZipPassThrough } from 'fflate'

import type { MeasureUnit } from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'

import type { MeasureAnnotations } from '../stores/measure-annotations'
import { renderMeasure } from './measure'
import { fetchMeasureImage, fetchSavedMeasuresPage } from './measure-history'

type SaveFilePicker = (options: {
  suggestedName?: string
  types?: Array<{ description?: string; accept: Record<string, Array<string>> }>
}) => Promise<{
  createWritable: () => Promise<{
    write: (chunk: Uint8Array) => Promise<void>
    close: () => Promise<void>
    abort?: () => Promise<void>
  }>
}>

function savePicker(): SaveFilePicker | undefined {
  return (window as Window & { showSaveFilePicker?: SaveFilePicker }).showSaveFilePicker
}

function fileBase(name: string): string {
  return name.replace(/\.[^.]+$/, '') || 'measurement'
}

function uniqueName(base: string, extension: string, used: Set<string>): string {
  let candidate = `${base}${extension}`
  let index = 2

  while (used.has(candidate.toLowerCase())) {
    candidate = `${base}-${index}${extension}`
    index += 1
  }

  used.add(candidate.toLowerCase())

  return candidate
}

function archiveName(): string {
  return `measurements-${new Date().toISOString().slice(0, 10)}.zip`
}

/**
 * Streams every saved measurement into one ZIP so the archive never has to sit
 * in memory: the picker gets a writable file and each rendered PNG is appended
 * as it is produced.
 */
export async function exportAllSavedMeasures(options: {
  annotations: MeasureAnnotations
  unit: MeasureUnit
  includeDetails: boolean
  onProgress?: (exported: number) => void
}): Promise<number> {
  const picker = savePicker()

  if (!picker) throw new Error(ERRORS.exportFailed)

  let handle: Awaited<ReturnType<SaveFilePicker>>

  try {
    handle = await picker({
      suggestedName: archiveName(),
      types: [{ description: 'ZIP archive', accept: { 'application/zip': ['.zip'] } }]
    })
  } catch {
    return 0
  }

  const writable = await handle.createWritable()
  const used = new Set<string>()
  let queue: Promise<void> = Promise.resolve()
  let failure: unknown = null
  let exported = 0

  const zip = new Zip((error, chunk) => {
    if (error) {
      failure = error
      return
    }

    queue = queue
      .then(() => writable.write(chunk))
      .catch((error: unknown) => {
        failure = error
      })
  })

  try {
    let cursor: string | null = null

    do {
      const page = await fetchSavedMeasuresPage(cursor)

      for (const measure of page.items) {
        if (!measure.result) continue

        try {
          const dataUrl = await fetchMeasureImage(measure.imageUrl)
          const blob = await renderMeasure(
            {
              dataUrl,
              width: measure.imageWidth,
              height: measure.imageHeight,
              name: measure.name
            },
            measure.result,
            options.annotations,
            options.unit,
            options.includeDetails
          )
          const entry = new ZipPassThrough(uniqueName(fileBase(measure.name), '.png', used))

          zip.add(entry)
          entry.push(new Uint8Array(await blob.arrayBuffer()), true)

          exported += 1
          options.onProgress?.(exported)
        } catch {
          // Skip measurements whose image is gone rather than failing the archive.
        }

        if (failure) throw failure

        await new Promise((resolve) => setTimeout(resolve, 0))
      }

      cursor = page.nextCursor
    } while (cursor)

    if (exported === 0) throw new Error(ERRORS.exportFailed)

    zip.end()
    await queue

    if (failure) throw failure

    await writable.close()

    return exported
  } catch (error) {
    await writable.abort?.().catch(() => undefined)

    throw error
  }
}
