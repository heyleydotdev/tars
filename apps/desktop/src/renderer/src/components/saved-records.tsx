import type { LucideIcon } from 'lucide-react'
import { BellIcon, ListTodoIcon, NotebookPenIcon, ReceiptIcon } from 'lucide-react'

import type { SavedRecordOutput } from '@tars/core/schemas/chat'
import { formatCurrency, formatDateTime } from '@tars/core/utils/format'

const recordIcons: Record<SavedRecordOutput['type'], LucideIcon> = {
  todo: ListTodoIcon,
  reminder: BellIcon,
  expense: ReceiptIcon,
  journal: NotebookPenIcon
}

function describeRecord(record: SavedRecordOutput): { title: string; detail: string | null } {
  switch (record.type) {
    case 'todo':
      return {
        title: record.title,
        detail: record.dueAt
          ? `Due ${formatDateTime(record.dueAt)}`
          : record.priority
            ? `${record.priority} priority`
            : null
      }
    case 'reminder':
      return { title: record.title, detail: `Reminds ${formatDateTime(record.remindAt)}` }
    case 'expense':
      return {
        title: record.description,
        detail: formatCurrency(record.amountCents, record.currency)
      }
    case 'journal':
      return { title: record.title ?? record.content, detail: record.mood }
  }
}

function SavedRecordItem({ record }: { record: SavedRecordOutput }) {
  const Icon = recordIcons[record.type]
  const { title, detail } = describeRecord(record)

  return (
    <li className="flex items-start gap-2 px-2 py-1.5">
      <Icon aria-hidden="true" className="text-muted-foreground mt-0.5 size-3.5 shrink-0" />
      <div className="min-w-0">
        <p className="truncate text-xs leading-5 font-medium">{title}</p>
        {detail ? (
          <p className="text-muted-foreground truncate text-[11px] leading-4">{detail}</p>
        ) : null}
      </div>
    </li>
  )
}

export default function SavedRecords({ records }: { records: Array<SavedRecordOutput> }) {
  return (
    <ul
      aria-label="Saved items"
      className="border-border/70 bg-card/60 w-fit max-w-[75%] rounded-xl border py-0.5"
    >
      {records.map((record) => (
        <SavedRecordItem key={record.id} record={record} />
      ))}
    </ul>
  )
}
