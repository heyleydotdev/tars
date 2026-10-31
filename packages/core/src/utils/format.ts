import type { MEASURE_UNITS } from '../constants'
import { ERRORS } from '../errors'

export type MeasureUnit = (typeof MEASURE_UNITS)[number]

const lengthFormats = new Map<MeasureUnit, Intl.NumberFormat>()

export function formatLength(valueMm: number, unit: MeasureUnit): string {
  let format = lengthFormats.get(unit)

  if (!format) {
    const digits = unit === 'in' ? 2 : 1

    format = new Intl.NumberFormat(undefined, {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    })
    lengthFormats.set(unit, format)
  }

  const value = unit === 'cm' ? valueMm / 10 : unit === 'in' ? valueMm / 25.4 : valueMm

  return `${format.format(value)} ${unit}`
}

const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
})

const timeFormat = new Intl.DateTimeFormat(undefined, {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23'
})

const amountFormats = new Map<string, Intl.NumberFormat>()

export function parseDate(value: string | null): Date | null {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date
}

export function formatDateTime(value: string): string {
  const date = parseDate(value)

  return date ? dateTimeFormat.format(date) : value
}

export function formatTime(value: string): string {
  const date = parseDate(value)

  return date ? timeFormat.format(date) : value
}

export function toDateKey(value: string | Date): string {
  const date = typeof value === 'string' ? parseDate(value) : value

  if (!date) return ''

  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}`
}

export function toMonthKey(value: string | Date): string {
  const date = typeof value === 'string' ? parseDate(value) : value

  if (!date) return ''

  return `${date.getFullYear()}-${`${date.getMonth() + 1}`.padStart(2, '0')}`
}

export function toDateTimeLocal(value: string | Date | null): string {
  const date = value ? (typeof value === 'string' ? parseDate(value) : value) : null

  if (!date || Number.isNaN(date.getTime())) return ''

  const month = `${date.getMonth() + 1}`.padStart(2, '0')
  const day = `${date.getDate()}`.padStart(2, '0')
  const hours = `${date.getHours()}`.padStart(2, '0')
  const minutes = `${date.getMinutes()}`.padStart(2, '0')

  return `${date.getFullYear()}-${month}-${day}T${hours}:${minutes}`
}

export function fromDateTimeLocal(value: string): string | null {
  if (!value) return null

  const date = new Date(value)

  return Number.isNaN(date.getTime()) ? null : date.toISOString()
}

export function fromDateTimeLocalRequired(value: string): string {
  const date = fromDateTimeLocal(value)

  if (!date) throw new Error(ERRORS.dateInvalid)

  return date
}

export function startOfMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

export function shiftMonth(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1)
}

export function buildMonthGrid(view: Date): Array<{ date: Date; key: string; outside: boolean }> {
  const year = view.getFullYear()
  const month = view.getMonth()
  const firstWeekday = new Date(year, month, 1).getDay()
  const days = new Date(year, month + 1, 0).getDate()

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstWeekday + 1
    const date = new Date(year, month, day)

    return {
      date,
      key: toDateKey(date),
      outside: day < 1 || day > days
    }
  })
}

export function formatDuration(durationMs: number): string {
  return durationMs >= 1000 ? `${(durationMs / 1000).toFixed(1)}s` : `${durationMs}ms`
}

export function formatCurrency(amountCents: number, currency: string): string {
  let format = amountFormats.get(currency)

  if (!format) {
    try {
      format = new Intl.NumberFormat(undefined, { style: 'currency', currency })
    } catch {
      return `${(amountCents / 100).toFixed(2)} ${currency}`
    }

    amountFormats.set(currency, format)
  }

  return format.format(amountCents / 100)
}

export function formatJson(content: string): string {
  try {
    return JSON.stringify(JSON.parse(content), null, 2)
  } catch {
    return content
  }
}

export function formatZonedIso(
  date: Date,
  timeZone: string | undefined
): {
  value: string
  zone: string
} {
  if (!timeZone) {
    return { value: date.toISOString(), zone: 'UTC' }
  }

  try {
    const parts = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    }).formatToParts(date)
    const map = Object.fromEntries(parts.map((part) => [part.type, part.value]))
    const offsetName =
      new Intl.DateTimeFormat('en-US', { timeZone, timeZoneName: 'longOffset' })
        .formatToParts(date)
        .find((part) => part.type === 'timeZoneName')?.value ?? 'GMT'
    const offset = offsetName === 'GMT' ? '+00:00' : offsetName.replace('GMT', '')

    return {
      value: `${map.year}-${map.month}-${map.day}T${map.hour}:${map.minute}:${map.second}${offset}`,
      zone: timeZone
    }
  } catch {
    return { value: date.toISOString(), zone: 'UTC' }
  }
}
