import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { zipSync } from 'fflate'

import type {
  CreateMeasureReferenceInput,
  MeasureBoxOutput,
  MeasureReferenceListOutput,
  MeasureRequestInput,
  MeasureResultOutput
} from '@tars/core/schemas/measure'
import type { MeasureUnit } from '@tars/core/utils/format'
import { ERRORS } from '@tars/core/errors'
import { formatDateTime, formatLength } from '@tars/core/utils/format'
import { measureWarnings } from '@tars/core/utils/measure'

import type { MeasureAnnotations } from '../stores/measure-annotations'
import { DEFAULT_OBJECT_FRAME } from '../stores/measure-annotations'
import { orpc } from './orpc'

const MAX_IMAGE_BYTES = 25 * 1024 * 1024
const MAX_IMAGE_EDGE = 1600

export type PreparedMeasureImage = {
  dataUrl: string
  width: number
  height: number
  name: string
}

export type MeasureBatchStatus = 'idle' | 'measuring' | 'done' | 'error'

export type MeasureRequest = {
  referenceId: string
  prompts: Array<string>
}

export type MeasureBatchItem = {
  id: string
  photo: PreparedMeasureImage
  status: MeasureBatchStatus
  result: MeasureResultOutput | null
  error: string | null
  prompts: Array<string> | null
  request: MeasureRequest | null
}

export const FRAME_REFERENCE_WIDTH = 400

export function frameFontSize(value: number, imageWidth: number): number {
  return (value * imageWidth) / FRAME_REFERENCE_WIDTH
}

export function frameLineWidth(imageWidth: number): number {
  return Math.max(2, (imageWidth * 2) / FRAME_REFERENCE_WIDTH)
}

export function frameLabelPadding(fontSize: number): number {
  return fontSize * 0.35
}

function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = name
  link.click()

  setTimeout(() => URL.revokeObjectURL(url), 10_000)
}

export function downloadText(text: string, name: string, type: string): void {
  downloadBlob(new Blob([text], { type }), name)
}

function exportName(name: string): string {
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

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()

    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error(ERRORS.imageUnreadable))
    image.src = src
  })
}

function drawBox(
  context: CanvasRenderingContext2D,
  box: MeasureBoxOutput,
  scaleX: number,
  scaleY: number,
  color: string,
  label: string,
  lineWidth: number,
  fontSize: number
): void {
  const x = box.x1 * scaleX
  const y = box.y1 * scaleY
  const width = box.width * scaleX
  const height = box.height * scaleY
  const padding = frameLabelPadding(fontSize)

  context.strokeStyle = color
  context.lineWidth = lineWidth
  context.strokeRect(x, y, width, height)

  context.fillStyle = color
  context.fillRect(x, y, context.measureText(label).width + padding * 2, fontSize + padding * 2)
  context.fillStyle = '#09090b'
  context.fillText(label, x + padding, y + padding)
}

export async function exportMeasure(
  photo: PreparedMeasureImage,
  result: MeasureResultOutput,
  annotations: MeasureAnnotations,
  unit: MeasureUnit,
  includeDetails: boolean
): Promise<void> {
  const blob = await renderMeasure(photo, result, annotations, unit, includeDetails)

  downloadBlob(blob, `${exportName(photo.name)}-measure.png`)
}

export async function exportMeasureBatch(
  items: Array<MeasureBatchItem>,
  annotations: MeasureAnnotations,
  unit: MeasureUnit,
  includeDetails: boolean
): Promise<void> {
  const files: Record<string, Uint8Array> = {}
  const used = new Set<string>()

  for (const item of items) {
    if (!item.result) continue

    const blob = await renderMeasure(item.photo, item.result, annotations, unit, includeDetails)
    const name = uniqueName(`${exportName(item.photo.name)}-measure`, '.png', used)

    files[name] = new Uint8Array(await blob.arrayBuffer())
  }

  if (Object.keys(files).length === 0) throw new Error(ERRORS.exportFailed)

  const archive = zipSync(files, { level: 0 })

  downloadBlob(new Blob([archive], { type: 'application/zip' }), 'measurements.zip')
}

function fitText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (context.measureText(text).width <= maxWidth) return text

  let end = text.length

  while (end > 1 && context.measureText(`${text.slice(0, end)}…`).width > maxWidth) {
    end -= 1
  }

  return `${text.slice(0, end)}…`
}

function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error(ERRORS.imagePrepareFailed))
      }
    }, 'image/png')
  })
}

async function composeReport(
  annotated: HTMLCanvasElement,
  photo: PreparedMeasureImage,
  result: MeasureResultOutput,
  unit: MeasureUnit
): Promise<Blob> {
  const width = annotated.width
  const padding = Math.round(width * 0.025)
  const titleSize = Math.max(18, Math.round(width / 50))
  const detailSize = Math.max(12, Math.round(width / 80))
  const lineHeight = Math.round(detailSize * 1.5)
  const objectLines = result.objects
    .slice(0, 12)
    .map(
      (object, index) =>
        `${index + 1}. ${object.prompt} — ${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`
    )
  const warnings = measureWarnings(result).map((warning) => `! ${warning.message}`)
  const extraObjects = result.objects.length - objectLines.length
  const lines = [
    `${formatDateTime(new Date().toISOString())} · ${result.reference.label} · ${result.scaleMmPerPx.toFixed(3)} mm/px`,
    ...objectLines,
    ...(extraObjects > 0 ? [`+${extraObjects} more objects`] : []),
    ...warnings
  ]
  const footerHeight =
    padding * 2 +
    Math.round(titleSize * 1.4) +
    lines.length * lineHeight +
    Math.round(lineHeight / 2)
  const report = document.createElement('canvas')
  const context = report.getContext('2d')

  if (!context) throw new Error(ERRORS.imagePrepareFailed)

  report.width = width
  report.height = annotated.height + footerHeight
  context.drawImage(annotated, 0, 0)
  context.fillStyle = '#ffffff'
  context.fillRect(0, annotated.height, width, footerHeight)
  context.fillStyle = '#09090b'
  context.fillRect(0, annotated.height, width, Math.max(2, Math.round(width / 800)))

  context.textBaseline = 'top'
  context.textAlign = 'left'

  const maxWidth = width - padding * 2
  let y = annotated.height + padding

  context.fillStyle = '#09090b'
  context.font = `600 ${titleSize}px 'Geist Variable', sans-serif`
  context.fillText(fitText(context, photo.name, maxWidth), padding, y)
  y += Math.round(titleSize * 1.4)

  context.font = `${detailSize}px 'Geist Mono Variable', ui-monospace, monospace`

  for (const line of lines) {
    context.fillStyle = line.startsWith('! ') ? '#b45309' : '#52525b'
    context.fillText(fitText(context, line, maxWidth), padding, y)
    y += lineHeight
  }

  return canvasToBlob(report)
}

export async function renderMeasure(
  photo: PreparedMeasureImage,
  result: MeasureResultOutput,
  annotations: MeasureAnnotations,
  unit: MeasureUnit,
  includeDetails: boolean
): Promise<Blob> {
  const image = await loadImage(photo.dataUrl)
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error(ERRORS.imagePrepareFailed)

  canvas.width = image.naturalWidth
  canvas.height = image.naturalHeight
  context.drawImage(image, 0, 0)

  const scaleX = canvas.width / result.image.width
  const scaleY = canvas.height / result.image.height
  const lineWidth = frameLineWidth(canvas.width)
  const fontSize = frameFontSize(annotations.fontSize, canvas.width)

  context.font = `${fontSize}px 'Geist Mono Variable', ui-monospace, SFMono-Regular, Menlo, monospace`
  context.textBaseline = 'top'

  if (annotations.reference.visible) {
    drawBox(
      context,
      result.reference.box,
      scaleX,
      scaleY,
      annotations.reference.color,
      'REF',
      lineWidth,
      fontSize
    )
  }

  for (const [index, object] of result.objects.entries()) {
    const setting = annotations.objects[index] ?? DEFAULT_OBJECT_FRAME

    if (!setting.visible) continue

    drawBox(
      context,
      object.box,
      scaleX,
      scaleY,
      setting.color,
      `${index + 1} · ${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`,
      lineWidth,
      fontSize
    )
  }

  if (includeDetails) {
    return composeReport(canvas, photo, result, unit)
  }

  return canvasToBlob(canvas)
}

export function measureSummary(item: MeasureBatchItem, unit: MeasureUnit): string {
  if (item.error) return `${item.photo.name}: ${item.error}`
  if (!item.result) return `${item.photo.name}: Not measured.`

  const result = item.result
  const objects = result.objects.map(
    (object) =>
      `${object.prompt}: ${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`
  )
  const warnings = measureWarnings(result).map((warning) => warning.message)

  return [
    item.photo.name,
    ...objects,
    `${result.reference.label} · ${result.scaleMmPerPx.toFixed(3)} mm/px`,
    ...warnings
  ].join('\n')
}

function csvCell(value: string | number): string {
  const text = String(value)

  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text
}

export function measureCsv(items: Array<MeasureBatchItem>, unit: MeasureUnit): string {
  const header = [
    'file',
    'status',
    'prompts',
    'object',
    'width',
    'height',
    'unit',
    'scale_mm_per_px',
    'reference',
    'error',
    'warnings'
  ]
  const rows = items.flatMap((item) => {
    const result = item.result
    const prompts = (item.prompts ?? result?.prompts ?? []).join(' / ')
    const base = [
      item.photo.name,
      item.status,
      prompts,
      '',
      '',
      '',
      unit,
      result?.scaleMmPerPx ?? '',
      result?.reference.label ?? '',
      item.error ?? '',
      result
        ? measureWarnings(result)
            .map((warning) => warning.message)
            .join('; ')
        : ''
    ]

    if (!result) return [base]

    return result.objects.map((object) => [
      item.photo.name,
      item.status,
      prompts,
      object.prompt,
      formatLength(object.widthMm, unit),
      formatLength(object.heightMm, unit),
      unit,
      result.scaleMmPerPx,
      result.reference.label,
      '',
      measureWarnings(result)
        .map((warning) => warning.message)
        .join('; ')
    ])
  })

  return [header, ...rows].map((row) => row.map(csvCell).join(',')).join('\n')
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',')

  if (!header || payload === undefined) throw new Error(ERRORS.imageUnreadable)

  const mime = /data:([^;]+)/.exec(header)?.[1] ?? 'image/jpeg'
  const binary = atob(payload)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return new Blob([bytes], { type: mime })
}

export function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()

    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error ?? new Error(ERRORS.imageUnreadable))
    reader.readAsDataURL(blob)
  })
}

export async function createMeasureThumbnail(
  photo: PreparedMeasureImage,
  edge = 320
): Promise<Blob> {
  const image = await loadImage(photo.dataUrl)
  const scale = Math.min(1, edge / Math.max(image.naturalWidth, image.naturalHeight))
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')

  if (!context) throw new Error(ERRORS.imagePrepareFailed)

  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale))
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale))
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob)
        } else {
          reject(new Error(ERRORS.imagePrepareFailed))
        }
      },
      'image/jpeg',
      0.82
    )
  })
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
    height,
    name: file.name
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
