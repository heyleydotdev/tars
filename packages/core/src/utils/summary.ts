import type { SummaryPeriod } from '../schemas/chat'

type LocalDate = {
  year: number
  month: number
  day: number
}

const formatterCache = new Map<string, Intl.DateTimeFormat>()

function formatter(timeZone: string): Intl.DateTimeFormat {
  let format = formatterCache.get(timeZone)

  if (!format) {
    format = new Intl.DateTimeFormat('en-CA', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23'
    })
    formatterCache.set(timeZone, format)
  }

  return format
}

function zoneOrUtc(timeZone: string | undefined): string {
  if (!timeZone) return 'UTC'

  try {
    formatter(timeZone)

    return timeZone
  } catch {
    return 'UTC'
  }
}

function partsAt(
  date: Date,
  timeZone: string
): LocalDate & { hour: number; minute: number; second: number } {
  const parts = formatter(timeZone).formatToParts(date)
  const value = (type: string): number =>
    Number(parts.find((part) => part.type === type)?.value ?? 0)

  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second')
  }
}

function offsetMs(date: Date, timeZone: string): number {
  const parts = partsAt(date, timeZone)

  return (
    Date.UTC(parts.year, parts.month - 1, parts.day, parts.hour, parts.minute, parts.second) -
    date.getTime()
  )
}

function zonedInstant(date: LocalDate, timeZone: string): Date {
  const guess = Date.UTC(date.year, date.month - 1, date.day)
  const first = guess - offsetMs(new Date(guess), timeZone)
  const second = guess - offsetMs(new Date(first), timeZone)
  const target = Date.UTC(date.year, date.month - 1, date.day)
  const candidates = [first, second].sort((left, right) => left - right)

  for (const candidate of candidates) {
    const parts = partsAt(new Date(candidate), timeZone)

    if (Date.UTC(parts.year, parts.month - 1, parts.day) >= target) {
      return new Date(candidate)
    }
  }

  return new Date(candidates[candidates.length - 1] ?? guess)
}

function addDays(date: LocalDate, days: number): LocalDate {
  const value = new Date(Date.UTC(date.year, date.month - 1, date.day + days))

  return {
    year: value.getUTCFullYear(),
    month: value.getUTCMonth() + 1,
    day: value.getUTCDate()
  }
}

function startOfWeek(date: LocalDate): LocalDate {
  const weekday = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay()

  return addDays(date, -((weekday + 6) % 7))
}

function nextStart(period: SummaryPeriod, start: LocalDate): LocalDate {
  if (period === 'day') return addDays(start, 1)
  if (period === 'week') return addDays(start, 7)
  if (period === 'month') {
    const value = new Date(Date.UTC(start.year, start.month, 1))

    return {
      year: value.getUTCFullYear(),
      month: value.getUTCMonth() + 1,
      day: 1
    }
  }

  return { year: start.year + 1, month: 1, day: 1 }
}

export function formatSummaryRange(
  period: SummaryPeriod,
  from: Date,
  to: Date,
  timeZone?: string
): string {
  const zone = zoneOrUtc(timeZone)
  const format = (date: Date, options: Intl.DateTimeFormatOptions): string =>
    new Intl.DateTimeFormat('en-US', { timeZone: zone, ...options }).format(date)

  if (period === 'day') return format(from, { month: 'short', day: 'numeric' })
  if (period === 'week') {
    return `${format(from, { month: 'short', day: 'numeric' })} – ${format(
      new Date(to.getTime() - 1),
      { month: 'short', day: 'numeric' }
    )}`
  }
  if (period === 'month') return format(from, { month: 'long', year: 'numeric' })

  return format(from, { year: 'numeric' })
}

export function summaryRequestText(period: SummaryPeriod): string {
  if (period === 'day') return 'Summarize today'
  if (period === 'week') return 'Summarize this week'
  if (period === 'month') return 'Summarize this month'

  return 'Summarize this year'
}

export function resolveSummaryRange(
  period: SummaryPeriod,
  now: Date,
  timeZone?: string
): { from: Date; to: Date; label: string } {
  const zone = zoneOrUtc(timeZone)
  const today = partsAt(now, zone)
  const local: LocalDate =
    period === 'day'
      ? { year: today.year, month: today.month, day: today.day }
      : period === 'week'
        ? startOfWeek(today)
        : period === 'month'
          ? { year: today.year, month: today.month, day: 1 }
          : { year: today.year, month: 1, day: 1 }
  const from = zonedInstant(local, zone)
  const to = zonedInstant(nextStart(period, local), zone)

  return {
    from,
    to,
    label: formatSummaryRange(period, from, to, zone)
  }
}
