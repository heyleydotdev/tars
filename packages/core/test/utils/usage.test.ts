import { describe, expect, it } from 'vitest'

import { DEFAULT_USAGE_CAP_MICROS } from '../../src/constants'
import { usageCostMicros, usageLimitMicros } from '../../src/utils/usage'

describe('usageCostMicros', () => {
  it('prices chat tokens per million', () => {
    expect(usageCostMicros('muse-spark-1.3', 1_000_000, 0)).toBe(150_000)
    expect(usageCostMicros('muse-spark-1.3', 0, 1_000_000)).toBe(600_000)
  })

  it('charges a flat price for segmentation', () => {
    expect(usageCostMicros('sam-3.1', 0, 0)).toBe(1_000)
  })
})

describe('usageLimitMicros', () => {
  it('reads dollars from the env value', () => {
    expect(usageLimitMicros('100')).toBe(100_000_000)
    expect(usageLimitMicros('0.5')).toBe(500_000)
  })

  it('falls back when the value is missing or invalid', () => {
    expect(usageLimitMicros(undefined)).toBe(DEFAULT_USAGE_CAP_MICROS)
    expect(usageLimitMicros('nope')).toBe(DEFAULT_USAGE_CAP_MICROS)
    expect(usageLimitMicros('-1')).toBe(DEFAULT_USAGE_CAP_MICROS)
  })
})
