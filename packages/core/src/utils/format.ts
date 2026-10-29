const dateTimeFormat = new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short'
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
