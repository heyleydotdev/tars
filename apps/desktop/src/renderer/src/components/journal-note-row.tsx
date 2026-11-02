import { PencilIcon, Trash2Icon } from 'lucide-react'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { Badge } from '@tars/ui/components/badge'
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
        <div className="mb-1 flex flex-wrap items-center gap-1.5">
          {entry.mood ? (
            <Badge variant="default" className="bg-amber-400/15 text-amber-300 capitalize">
              ::{entry.mood}
            </Badge>
          ) : null}
          {entry.tags.map((tag) => (
            <Badge key={tag} variant="default" className="bg-sky-400/15 text-sky-300 capitalize">
              #{tag}
            </Badge>
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
