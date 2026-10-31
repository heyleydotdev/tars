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

export type MeasurePromptObjects = {
  prompt: string
  objects: Array<SamDetection>
}

export type MeasureWarningCode =
  | 'multiple-reference-matches'
  | 'small-reference'
  | 'reference-aspect'
  | 'object-at-edge'
  | 'small-object'
  | 'missing-prompt'
  | 'scale-outlier'

export type MeasureWarning = {
  code: MeasureWarningCode
  message: string
}

export function scaleFromBoxes(
  reference: MeasureReferenceItemOutput,
  referenceBox: MeasureBoxOutput
): number {
  const referenceLongPx = Math.max(referenceBox.width, referenceBox.height)
  const referenceShortPx = Math.min(referenceBox.width, referenceBox.height)
  const referenceLongMm = Math.max(reference.widthMm, reference.heightMm)
  const referenceShortMm = Math.min(reference.widthMm, reference.heightMm)
  const scaleMmPerPx = (referenceLongMm / referenceLongPx + referenceShortMm / referenceShortPx) / 2

  if (!Number.isFinite(scaleMmPerPx) || scaleMmPerPx <= 0) {
    throw new Error(ERRORS.referenceTooSmall)
  }

  return scaleMmPerPx
}

export function buildMeasureResult(input: {
  reference: MeasureReferenceItemOutput
  referenceBox: SamDetection
  referenceMatches: number
  prompts: Array<string>
  promptObjects: Array<MeasurePromptObjects>
}): MeasureResultOutput {
  const scaleMmPerPx = scaleFromBoxes(input.reference, input.referenceBox.box)

  const objects: Array<MeasureObjectOutput> = input.promptObjects.flatMap((group) =>
    group.objects.map((object) => ({
      prompt: group.prompt,
      box: object.box,
      widthMm: round(object.box.width * scaleMmPerPx),
      heightMm: round(object.box.height * scaleMmPerPx)
    }))
  )

  const missingPrompts = input.prompts.filter(
    (prompt) =>
      !input.promptObjects.some((group) => group.prompt === prompt && group.objects.length)
  )

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
    objects,
    prompts: input.prompts,
    missingPrompts
  }
}

export function recalculateMeasureResult(
  result: MeasureResultOutput,
  boxes: {
    reference: MeasureBoxOutput
    objects: Array<MeasureBoxOutput>
  }
): MeasureResultOutput {
  const scaleMmPerPx = scaleFromBoxes(result.reference, boxes.reference)

  return {
    ...result,
    scaleMmPerPx: round(scaleMmPerPx, 4),
    reference: {
      ...result.reference,
      box: boxes.reference
    },
    objects: result.objects.map((object, index) => {
      const box = boxes.objects[index] ?? object.box

      return {
        ...object,
        box,
        widthMm: round(box.width * scaleMmPerPx),
        heightMm: round(box.height * scaleMmPerPx)
      }
    })
  }
}

export function measureWarnings(
  result: MeasureResultOutput,
  scaleBaseline?: number
): Array<MeasureWarning> {
  const warnings: Array<MeasureWarning> = []
  const imageArea = result.image.width * result.image.height
  const referenceArea = result.reference.box.width * result.reference.box.height

  if (result.reference.matches > 1) {
    warnings.push({
      code: 'multiple-reference-matches',
      message: `Reference matched ${result.reference.matches} times; using the largest one.`
    })
  }

  if (imageArea > 0 && referenceArea / imageArea < 0.015) {
    warnings.push({
      code: 'small-reference',
      message: 'Reference is small in the frame; measurements may be less accurate.'
    })
  }

  const expectedRatio = result.reference.widthMm / result.reference.heightMm
  const boxRatio = result.reference.box.width / result.reference.box.height
  const ratioDeviation = Math.min(
    Math.abs(boxRatio / expectedRatio - 1),
    Math.abs(boxRatio * expectedRatio - 1)
  )

  if (Number.isFinite(ratioDeviation) && ratioDeviation > 0.12) {
    warnings.push({
      code: 'reference-aspect',
      message:
        'Reference box shape does not match the reference dimensions; check perspective or placement.'
    })
  }

  const edge = 2

  if (
    result.objects.some(
      (object) =>
        object.box.x1 <= edge ||
        object.box.y1 <= edge ||
        object.box.x2 >= result.image.width - edge ||
        object.box.y2 >= result.image.height - edge
    )
  ) {
    warnings.push({
      code: 'object-at-edge',
      message: 'An object touches the image edge; part of it may be cut off.'
    })
  }

  if (
    imageArea > 0 &&
    result.objects.some((object) => (object.box.width * object.box.height) / imageArea < 0.001)
  ) {
    warnings.push({
      code: 'small-object',
      message: 'A matched object is very small; verify the box.'
    })
  }

  for (const prompt of result.missingPrompts) {
    warnings.push({
      code: 'missing-prompt',
      message: `No matches for "${prompt}".`
    })
  }

  if (
    scaleBaseline !== undefined &&
    scaleBaseline > 0 &&
    Math.abs(result.scaleMmPerPx / scaleBaseline - 1) > 0.25
  ) {
    warnings.push({
      code: 'scale-outlier',
      message: 'Scale differs from the rest of the batch; check the reference in this photo.'
    })
  }

  return warnings
}
