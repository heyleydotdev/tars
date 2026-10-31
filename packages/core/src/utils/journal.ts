import type { JournalMeasurementItemOutput } from '../schemas/journal'
import type { MeasureUnit } from '../schemas/measure'
import { formatLength } from './format'

export const JOURNAL_MEASUREMENT_CONTENT_LIMIT = 6_000

export function formatMeasurementJournalBlock(
  items: Array<JournalMeasurementItemOutput>,
  unit: MeasureUnit
): string {
  return items
    .map((item) => {
      const objects = item.objects
        .map(
          (object) =>
            `${object.prompt} ${formatLength(object.widthMm, unit)} × ${formatLength(object.heightMm, unit)}`
        )
        .join('; ')

      return `- ${item.name}: ${objects}`
    })
    .join('\n')
}

export function appendJournalContent(
  existing: string,
  block: string,
  limit = JOURNAL_MEASUREMENT_CONTENT_LIMIT
): string {
  const content = existing ? `${existing}\n${block}` : block

  if (content.length <= limit) return content

  return `Older measurement entries trimmed.\n${content.slice(-limit)}`
}
