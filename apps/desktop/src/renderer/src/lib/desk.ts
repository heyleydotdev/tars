import type { SavedRecordOutput } from '@tars/core/schemas/chat'
import { formatCurrency, formatDateTime } from '@tars/core/utils/format'

function escapeMarkdown(value: string): string {
  return value.replace(/([\\`*_[\]()<>])/g, '\\$1')
}

function recordLine(record: SavedRecordOutput): string {
  switch (record.type) {
    case 'todo':
      return `- **${escapeMarkdown(record.title || 'Untitled')}** — todo${
        record.done
          ? ' · done'
          : record.dueAt
            ? ` · ${formatDateTime(record.dueAt)}`
            : record.priority
              ? ` · ${record.priority} priority`
              : ''
      }`
    case 'reminder':
      return `- **${escapeMarkdown(record.title || 'Untitled')}** — reminder · ${formatDateTime(record.remindAt)}`
    case 'expense':
      return `- **${escapeMarkdown(record.title || record.description || 'Expense')}** — expense · ${formatCurrency(
        record.amountCents,
        record.currency
      )}`
    case 'journal':
      return `- **${escapeMarkdown(record.title || record.content || 'Journal')}** — journal${
        record.mood ? ` · ${escapeMarkdown(record.mood)}` : ''
      }`
  }
}

export function deskResultMarkdown(reply: string, records: Array<SavedRecordOutput>): string {
  if (records.length === 0) {
    return reply
  }

  return `${records.map(recordLine).join('\n')}\n\n${reply || 'Saved to Desk.'}`
}
