import { describe, expect, it } from 'vitest'

import type {
  MeasureBoxOutput,
  MeasureReferenceItemOutput,
  SamDetection
} from '../../src/schemas/measure'
import { ERRORS } from '../../src/errors'
import {
  buildMeasureResult,
  measureWarnings,
  parseSamBoxes,
  pickLargestDetection,
  scaleFromBoxes
} from '../../src/utils/measure'

function box(x1: number, y1: number, x2: number, y2: number): MeasureBoxOutput {
  return { x1, y1, x2, y2, width: x2 - x1, height: y2 - y1 }
}

function detection(
  x1: number,
  y1: number,
  x2: number,
  y2: number,
  imageWidth = 1000,
  imageHeight = 800
): SamDetection {
  return { box: box(x1, y1, x2, y2), imageWidth, imageHeight }
}

const reference: MeasureReferenceItemOutput = {
  id: 'reference-1',
  label: 'Bank card',
  prompt: 'card',
  widthMm: 1000,
  heightMm: 500
}

describe('parseSamBoxes', () => {
  it('reads box and image dimensions', () => {
    const boxes = parseSamBoxes(
      'prefix <|box;x1=10;y1=20;x2=110;y2=70;w=1000;h=800;label=cup|> suffix'
    )

    expect(boxes).toEqual([
      {
        box: { x1: 10, y1: 20, x2: 110, y2: 70, width: 100, height: 50 },
        imageWidth: 1000,
        imageHeight: 800
      }
    ])
  })

  it('ignores zero-sized and malformed boxes', () => {
    expect(
      parseSamBoxes('<|box;x1=10;y1=10;x2=10;y2=50;w=100;h=100|><|box;x1=0;y1=0;x2=5;y2=5;w=100|>')
    ).toEqual([])
  })
})

describe('pickLargestDetection', () => {
  it('picks the detection with the largest area', () => {
    const small = detection(0, 0, 10, 10)
    const large = detection(0, 0, 50, 20)

    expect(pickLargestDetection([])).toBeNull()
    expect(pickLargestDetection([small, large, small])).toBe(large)
  })
})

describe('scaleFromBoxes', () => {
  it('averages the long and short axis scales', () => {
    expect(scaleFromBoxes(reference, box(0, 0, 200, 100))).toBe(5)
    expect(scaleFromBoxes({ ...reference, widthMm: 200, heightMm: 100 }, box(0, 0, 100, 50))).toBe(
      2
    )
  })

  it('rejects a reference without size', () => {
    expect(() => scaleFromBoxes(reference, box(0, 0, 0, 0))).toThrow(ERRORS.referenceTooSmall)
  })
})

describe('buildMeasureResult', () => {
  it('measures objects and reports prompts without matches', () => {
    const result = buildMeasureResult({
      reference,
      referenceBox: detection(0, 0, 200, 100),
      referenceMatches: 1,
      prompts: ['cup', 'laptop'],
      promptObjects: [{ prompt: 'cup', objects: [detection(10, 10, 50, 30)] }]
    })

    expect(result.scaleMmPerPx).toBe(5)
    expect(result.image).toEqual({ width: 1000, height: 800 })
    expect(result.reference.box).toEqual(box(0, 0, 200, 100))
    expect(result.objects).toEqual([
      { prompt: 'cup', box: box(10, 10, 50, 30), widthMm: 200, heightMm: 100 }
    ])
    expect(result.missingPrompts).toEqual(['laptop'])
  })
})

describe('measureWarnings', () => {
  function baseResult() {
    return buildMeasureResult({
      reference,
      referenceBox: detection(0, 0, 200, 100),
      referenceMatches: 1,
      prompts: ['cup'],
      promptObjects: [{ prompt: 'cup', objects: [detection(100, 100, 140, 120)] }]
    })
  }

  function codes(result: ReturnType<typeof baseResult>, baseline?: number): Array<string> {
    return measureWarnings(result, baseline).map((warning) => warning.code)
  }

  it('reports multiple reference matches', () => {
    const result = baseResult()

    expect(codes({ ...result, reference: { ...result.reference, matches: 2 } })).toContain(
      'multiple-reference-matches'
    )
  })

  it('reports a reference that is small in the frame', () => {
    const result = baseResult()

    expect(
      codes({
        ...result,
        reference: { ...result.reference, box: box(0, 0, 40, 20) }
      })
    ).toContain('small-reference')
  })

  it('reports an aspect ratio mismatch', () => {
    const result = baseResult()

    expect(
      codes({
        ...result,
        reference: { ...result.reference, box: box(0, 0, 100, 100) }
      })
    ).toContain('reference-aspect')
  })

  it('reports edge, tiny, missing, and outlier cases', () => {
    const result = baseResult()
    const [object] = result.objects

    if (!object) throw new Error('expected one measured object')

    const edge = {
      ...result,
      objects: [{ ...object, box: box(1, 100, 41, 120) }]
    }
    const tiny = {
      ...result,
      objects: [{ ...object, box: box(100, 100, 110, 110) }]
    }

    expect(codes(edge)).toContain('object-at-edge')
    expect(codes(tiny)).toContain('small-object')
    expect(codes({ ...result, missingPrompts: ['laptop'] })).toContain('missing-prompt')
    expect(codes(result, result.scaleMmPerPx * 1.5)).toContain('scale-outlier')
  })

  it('returns nothing for a clean result', () => {
    expect(codes(baseResult())).toEqual([])
  })
})
