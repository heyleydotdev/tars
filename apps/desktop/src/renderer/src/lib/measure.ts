import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  CreateMeasureReferenceInput,
  MeasureReferenceListOutput,
  MeasureRequestInput
} from '@tars/core/schemas/measure'
import { ERRORS } from '@tars/core/errors'

import { orpc } from './orpc'

const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600
const mmFormat = new Intl.NumberFormat(undefined, {
  minimumFractionDigits: 1,
  maximumFractionDigits: 1
})

export type PreparedMeasureImage = {
  dataUrl: string
  width: number
  height: number
}

export function formatMm(value: number): string {
  return `${mmFormat.format(value)} mm`
}

export async function prepareMeasureImage(file: File): Promise<PreparedMeasureImage> {
  if (!file.type.startsWith('image/')) {
    throw new Error(ERRORS.imageTypeInvalid)
  }

  if (file.size > MAX_IMAGE_BYTES) {
    throw new Error(ERRORS.imageTooLarge)
  }

  const bitmap = await createImageBitmap(file).catch(() => {
    throw new Error(ERRORS.imageUnreadable)
  })
  const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height))
  const width = Math.max(1, Math.round(bitmap.width * scale))
  const height = Math.max(1, Math.round(bitmap.height * scale))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  canvas.width = width
  canvas.height = height

  if (!context) {
    bitmap.close()
    throw new Error(ERRORS.imagePrepareFailed)
  }

  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, width, height)
  context.drawImage(bitmap, 0, 0, width, height)
  bitmap.close()

  return {
    dataUrl: canvas.toDataURL('image/jpeg', 0.9),
    width,
    height
  }
}

const measureReferencesKey = orpc.measure.references.queryKey()

export function useMeasureReferences() {
  return useQuery(orpc.measure.references.queryOptions())
}

export function useCreateMeasureReference() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: CreateMeasureReferenceInput) => orpc.measure.createReference.call(input),
    onSuccess: (reference) => {
      queryClient.setQueryData<MeasureReferenceListOutput>(measureReferencesKey, (page) => ({
        items: [...(page?.items ?? []), reference]
      }))
    }
  })
}

export function useMeasure() {
  return useMutation({
    mutationFn: (input: MeasureRequestInput) => orpc.measure.run.call(input)
  })
}
