import { describe, expect, it } from 'vitest'

import { frameCornerSize } from '../../src/renderer/src/lib/measure'

describe('frameCornerSize', () => {
  it('keeps a readable minimum on small labels', () => {
    expect(frameCornerSize(4)).toBe(12)
  })

  it('grows with the label size', () => {
    expect(frameCornerSize(20)).toBe(28)
  })
})
