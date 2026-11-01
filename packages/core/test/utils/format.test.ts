import { describe, expect, it } from 'bun:test'

import {
  buildMonthGrid,
  formatCurrency,
  formatDateTime,
  formatDuration,
  formatJson,
  formatLength,
  formatTime,
  formatZonedIso,
  fromDateTimeLocal,
  fromDateTimeLocalRequired,
  parseDate,
  shiftMonth,
  startOfMonth,
  toDateKey,
  toDateTimeLocal,
  toMonthKey
} from '../../src/utils/format'

describe('parseDate', () => {
  it('returns null for missing or invalid input', () => {
    expect(parseDate(null)).toBeNull()
    expect(parseDate('')).toBeNull()
    expect(parseDate('not a date')).toBeNull()
  })

  it('parses iso strings', () => {
    expect(parseDate('2026-11-01T10:00:00.000Z')?.toISOString()).toBe('2026-11-01T10:00:00.000Z')
  })
})

describe('date keys', () => {
  it('builds local day and month keys', () => {
    expect(toDateKey(new Date(2026, 0, 5))).toBe('2026-01-05')
    expect(toMonthKey(new Date(2026, 0, 5))).toBe('2026-01')
    expect(toDateKey('2026-01-05T12:00:00.000Z')).toMatch(/^2026-01-0[45]$/)
  })

  it('returns an empty key for invalid input', () => {
    expect(toDateKey('nope')).toBe('')
    expect(toMonthKey('nope')).toBe('')
  })
})

describe('date time local', () => {
  it('round-trips a local datetime value', () => {
    const value = '2026-11-01T09:05'
    const iso = fromDateTimeLocal(value)

    expect(iso).not.toBeNull()
    expect(toDateTimeLocal(iso)).toBe(value)
  })

  it('rejects invalid values', () => {
    expect(fromDateTimeLocal('')).toBeNull()
    expect(fromDateTimeLocal('nope')).toBeNull()
    expect(() => fromDateTimeLocalRequired('nope')).toThrow()
  })
})

describe('month helpers', () => {
  it('starts at the first of the month and shifts by whole months', () => {
    const date = new Date(2026, 0, 31)

    expect(startOfMonth(date).getDate()).toBe(1)
    expect(shiftMonth(date, 1).getMonth()).toBe(1)
    expect(shiftMonth(date, 1).getDate()).toBe(1)
    expect(shiftMonth(date, -1).getMonth()).toBe(11)
  })

  it('pads a month grid with outside days', () => {
    const grid = buildMonthGrid(new Date(2026, 9, 1))

    expect(grid).toHaveLength(42)
    expect(grid[0]?.key).toBe('2026-09-27')
    expect(grid[0]?.outside).toBe(true)
    expect(grid[4]?.key).toBe('2026-10-01')
    expect(grid[4]?.outside).toBe(false)
    expect(grid.at(-1)?.outside).toBe(true)
  })
})

describe('formatting', () => {
  it('formats lengths with unit conversion', () => {
    expect(formatLength(100, 'mm')).toMatch(/^100[.,]0 mm$/)
    expect(formatLength(100, 'cm')).toMatch(/^10[.,]0 cm$/)
    expect(formatLength(25.4, 'in')).toMatch(/^1[.,]00 in$/)
  })

  it('formats durations below and above a second', () => {
    expect(formatDuration(999)).toBe('999ms')
    expect(formatDuration(1500)).toBe('1.5s')
  })

  it('formats currency amounts', () => {
    expect(formatCurrency(1250, 'USD')).toMatch(/12[.,]50/)
    expect(formatCurrency(1250, 'not-a-currency')).toBe('12.50 not-a-currency')
  })

  it('pretties valid json and leaves invalid json alone', () => {
    expect(formatJson('{"a":1}')).toBe('{\n  "a": 1\n}')
    expect(formatJson('{oops')).toBe('{oops')
  })

  it('falls back to the raw string for invalid dates', () => {
    expect(formatTime('nope')).toBe('nope')
    expect(formatDateTime('nope')).toBe('nope')
    expect(formatTime('2026-11-01T10:15:00.000Z')).toMatch(/^\d{2}:\d{2}$/)
  })

  it('formats zoned iso values and falls back to utc', () => {
    const date = new Date('2026-11-01T10:00:00.000Z')

    expect(formatZonedIso(date, 'Asia/Kolkata')).toEqual({
      value: '2026-11-01T15:30:00+05:30',
      zone: 'Asia/Kolkata'
    })
    expect(formatZonedIso(date, undefined)).toEqual({
      value: '2026-11-01T10:00:00.000Z',
      zone: 'UTC'
    })
    expect(formatZonedIso(date, 'Mars/Olympus')).toEqual({
      value: '2026-11-01T10:00:00.000Z',
      zone: 'UTC'
    })
  })
})
