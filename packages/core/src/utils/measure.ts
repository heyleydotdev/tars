import type {
  MeasureBoxOutput,
  MeasureObjectOutput,
  MeasureReferenceItemOutput,
  MeasureResultOutput
} from '../schemas/measure'
import { ERRORS } from '../errors'

const BOX_PATTERN =
  /<\|box;x1=([\d.]+);y1=([\d.]+);x2=([\d.]+);y2=([\d.]+);w=(\d+);h=(\d+)[^|]*\|>/g

export type SamDetection = {
  box: MeasureBoxOutput
  imageWidth: number
  imageHeight: number
}

function round(value: number, digits = 1): number {
  const factor = 10 ** digits

  return Math.round(value * factor) / factor
}

export function parseSamBoxes(text: string): Array<SamDetection> {
  return [...text.matchAll(BOX_PATTERN)].flatMap((match) => {
    const x1 = Number(match[1])
    const y1 = Number(match[2])
    const x2 = Number(match[3])
    const y2 = Number(match[4])
    const imageWidth = Number(match[5])
    const imageHeight = Number(match[6])
    const width = Math.max(0, x2 - x1)
    const height = Math.max(0, y2 - y1)

    if (!Number.isFinite(width) || !Number.isFinite(height) || width === 0 || height === 0) {
      return []
    }

    return [
      {
        box: { x1, y1, x2, y2, width, height },
        imageWidth,
        imageHeight
      }
    ]
  })
}

export function pickLargestDetection(detections: Array<SamDetection>): SamDetection | null {
  return detections.reduce<SamDetection | null>((best, detection) => {
    if (!best) return detection

    return detection.box.width * detection.box.height > best.box.width * best.box.height
      ? detection
      : best
  }, null)
}

export function buildMeasureResult(input: {
  reference: MeasureReferenceItemOutput
  referenceBox: SamDetection
  referenceMatches: number
  objectPrompt: string
  objects: Array<SamDetection>
}): MeasureResultOutput {
  const referenceLongPx = Math.max(input.referenceBox.box.width, input.referenceBox.box.height)
  const referenceShortPx = Math.min(input.referenceBox.box.width, input.referenceBox.box.height)
  const referenceLongMm = Math.max(input.reference.widthMm, input.reference.heightMm)
  const referenceShortMm = Math.min(input.reference.widthMm, input.reference.heightMm)
  const scaleMmPerPx = (referenceLongMm / referenceLongPx + referenceShortMm / referenceShortPx) / 2

  if (!Number.isFinite(scaleMmPerPx) || scaleMmPerPx <= 0) {
    throw new Error(ERRORS.referenceTooSmall)
  }

  const objects: Array<MeasureObjectOutput> = input.objects.map((object) => ({
    prompt: input.objectPrompt,
    box: object.box,
    widthMm: round(object.box.width * scaleMmPerPx),
    heightMm: round(object.box.height * scaleMmPerPx)
  }))

  return {
    image: {
      width: input.referenceBox.imageWidth,
      height: input.referenceBox.imageHeight
    },
    scaleMmPerPx: round(scaleMmPerPx, 4),
    reference: {
      ...input.reference,
      box: input.referenceBox.box,
      matches: input.referenceMatches
    },
    objects
  }
}
