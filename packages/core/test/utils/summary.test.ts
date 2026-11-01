import { describe, expect, it } from 'vitest'

import {
  formatSummaryRange,
  resolveSummaryRange,
  summaryRequestText
} from '../../src/utils/summary'

const NOW = new Date('2026-11-01T18:00:00.000Z')

describe('resolveSummaryRange', () => {
  it('resolves a local day', () => {
    const range = resolveSummaryRange('day', NOW, 'Asia/Kolkata')

    expect(range.from.toISOString()).toBe('2026-10-31T18:30:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-01T18:30:00.000Z')
    expect(range.label).toBe('Nov 1')
  })

  it('starts weeks on Monday', () => {
    const range = resolveSummaryRange('week', NOW, 'Asia/Kolkata')

    expect(range.from.toISOString()).toBe('2026-10-25T18:30:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-01T18:30:00.000Z')
    expect(range.label).toBe('Oct 26 – Nov 1')
  })

  it('resolves calendar months and years', () => {
    const month = resolveSummaryRange('month', NOW, 'Asia/Kolkata')
    const year = resolveSummaryRange('year', NOW, 'Asia/Kolkata')

    expect(month.from.toISOString()).toBe('2026-10-31T18:30:00.000Z')
    expect(month.to.toISOString()).toBe('2026-11-30T18:30:00.000Z')
    expect(month.label).toBe('November 2026')

    expect(year.from.toISOString()).toBe('2025-12-31T18:30:00.000Z')
    expect(year.to.toISOString()).toBe('2026-12-31T18:30:00.000Z')
    expect(year.label).toBe('2026')
  })

  it('handles a DST boundary', () => {
    const range = resolveSummaryRange(
      'day',
      new Date('2026-03-08T12:00:00.000Z'),
      'America/New_York'
    )

    expect(range.from.toISOString()).toBe('2026-03-08T05:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-03-09T04:00:00.000Z')
  })

  it('handles a 25-hour day at DST fall-back', () => {
    const range = resolveSummaryRange(
      'day',
      new Date('2026-11-01T15:00:00.000Z'),
      'America/New_York'
    )

    expect(range.from.toISOString()).toBe('2026-11-01T04:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-02T05:00:00.000Z')
  })

  it('starts at 01:00 when local midnight does not exist', () => {
    const range = resolveSummaryRange(
      'day',
      new Date('2026-09-06T15:00:00.000Z'),
      'America/Santiago'
    )

    expect(range.from.toISOString()).toBe('2026-09-06T04:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-09-07T03:00:00.000Z')
    expect(range.label).toBe('Sep 6')
  })

  it('falls back to UTC for an invalid zone', () => {
    const range = resolveSummaryRange('day', NOW, 'Mars/Olympus')

    expect(range.from.toISOString()).toBe('2026-11-01T00:00:00.000Z')
    expect(range.to.toISOString()).toBe('2026-11-02T00:00:00.000Z')
  })
})

describe('formatSummaryRange', () => {
  it('labels a stored week', () => {
    expect(
      formatSummaryRange(
        'week',
        new Date('2026-10-25T18:30:00.000Z'),
        new Date('2026-11-01T18:30:00.000Z'),
        'Asia/Kolkata'
      )
    ).toBe('Oct 26 – Nov 1')
  })
})

describe('summaryRequestText', () => {
  it('names each period', () => {
    expect(summaryRequestText('day')).toBe('Summarize today')
    expect(summaryRequestText('week')).toBe('Summarize this week')
    expect(summaryRequestText('month')).toBe('Summarize this month')
    expect(summaryRequestText('year')).toBe('Summarize this year')
  })
})
