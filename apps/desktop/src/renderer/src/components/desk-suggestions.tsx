import type { SavedRecordOutput } from '@tars/core/schemas/chat'
import { Button } from '@tars/ui/components/button'

import { useChatMessages } from '../lib/chat'

const STARTERS = [
  'Remind me to review the PR tomorrow at 10am, fix the flaky test, and log $6 for coffee.',
  'Shipped the migration today — journal how it went.'
]

function buildSuggestions(records: Array<SavedRecordOutput>): Array<string> {
  const record =
    records.find((item) => item.type === 'todo' && !item.done) ??
    records.find((item) => item.type === 'reminder') ??
    records.find((item) => item.type === 'expense')

  if (!record) return STARTERS

  switch (record.type) {
    case 'todo':
      return [
        `Move the ${record.title} todo to tomorrow.`,
        `Remove the ${record.title} todo.`,
        ...STARTERS
      ]
    case 'reminder':
      return [
        `Change the ${record.title} reminder to tomorrow at 6pm.`,
        `Remove the ${record.title} reminder.`,
        ...STARTERS
      ]
    case 'expense':
      return [
        `Change the ${record.title} expense to $15.`,
        `Remove the ${record.title} expense.`,
        ...STARTERS
      ]
    default:
      return STARTERS
  }
}

export default function DeskSuggestions(props: {
  disabled: boolean
  onSelect: (suggestion: string) => void
}) {
  const { disabled, onSelect } = props
  const { data: messages = [] } = useChatMessages()
  const recent = messages.slice(-20)
  const latest = [...recent].reverse().find((message) => message.records.length > 0)
  const suggestions = buildSuggestions(latest?.records ?? [])

  return (
    <div className="scroll-fade-x mb-2 flex scrollbar-none gap-2 overflow-x-auto overscroll-x-contain">
      {suggestions.map((suggestion) => (
        <Button
          key={suggestion}
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          disabled={disabled}
          onClick={() => onSelect(suggestion)}
        >
          {suggestion}
        </Button>
      ))}
    </div>
  )
}
