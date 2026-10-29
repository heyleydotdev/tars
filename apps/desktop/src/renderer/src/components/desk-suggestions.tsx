import type { SavedRecordOutput } from '@tars/core/schemas/chat'
import { Button } from '@tars/ui/components/button'

import { useChatMessages } from '../lib/chat'

const STARTERS = [
  'Remind me to call mom tomorrow at 5pm, buy milk, and log $12.50 for lunch.',
  'I felt proud after shipping the demo — save that.'
]

function buildSuggestions(records: Array<SavedRecordOutput>): Array<string> {
  const record =
    records.find((item) => item.type === 'todo') ??
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
        `Change the ${record.description} expense to $15.`,
        `Remove the ${record.description} expense.`,
        ...STARTERS
      ]
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
