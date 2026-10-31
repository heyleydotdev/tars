import { PencilIcon, Trash2Icon } from 'lucide-react'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { ContextMenuItem } from '@tars/ui/components/context-menu'

import JournalRow from './journal-row'

export default function JournalNoteRow({
  entry,
  onEdit,
  onDelete
}: {
  entry: JournalItemOutput
  onEdit: (entry: JournalItemOutput) => void
  onDelete: (entry: JournalItemOutput) => void
}) {
  return (
    <JournalRow
      entry={entry}
      menu={
        <>
          <ContextMenuItem onClick={() => onEdit(entry)}>
            <PencilIcon />
            Edit note
          </ContextMenuItem>
          <ContextMenuItem variant="destructive" onClick={() => onDelete(entry)}>
            <Trash2Icon />
            Delete note
          </ContextMenuItem>
        </>
      }
    >
      {entry.mood || entry.tags.length > 0 ? (
        <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs/6 font-medium uppercase">
          {entry.mood ? <span className="text-amber-300">::{entry.mood}</span> : null}
          {entry.tags.map((tag) => (
            <span
              key={tag}
              className="text-background relative inline-flex px-1.5 py-0.5 leading-none"
            >
              <span aria-hidden className="bg-foreground absolute inset-0 skew-x-12" />
              <span className="relative">#{tag}</span>
            </span>
          ))}
        </div>
      ) : null}
      {entry.title ? (
        <h3 className="text-foreground font-sans text-sm/6 font-medium wrap-break-word">
          {entry.title}
        </h3>
      ) : null}
      <p className="text-muted-foreground mt-1 font-sans text-[0.8rem]/6 wrap-break-word whitespace-pre-line select-text">
        {entry.content}
      </p>
    </JournalRow>
  )
}
