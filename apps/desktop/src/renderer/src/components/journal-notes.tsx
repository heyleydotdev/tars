import { PencilIcon, Trash2Icon } from 'lucide-react'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { toDateKey } from '@tars/core/utils/format'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'

import ConsoleEnd from './console-end'
import { ConsoleEmpty } from './console-panel'

export default function JournalNotes({
  journals,
  onEdit,
  onDelete
}: {
  journals: Array<JournalItemOutput>
  onEdit: (entry: JournalItemOutput) => void
  onDelete: (entry: JournalItemOutput) => void
}) {
  if (journals.length === 0) {
    return <ConsoleEmpty title="no entries" hint="tell tars about your day" />
  }

  return (
    <>
      <ol className="divide-border divide-y">
        {journals.map((entry) => (
          <ContextMenu key={entry.id}>
            <ContextMenuTrigger
              render={
                <li className="hover:bg-muted grid grid-cols-[5rem_minmax(0,1fr)] gap-3 px-3 py-3 transition-colors" />
              }
            >
              <time
                dateTime={entry.occurredAt}
                className="text-muted-foreground pt-0.5 text-xs tabular-nums"
              >
                {toDateKey(entry.occurredAt)}
              </time>
              <div className="min-w-0">
                {entry.mood || entry.tags.length > 0 ? (
                  <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs font-medium uppercase">
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
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent>
              <ContextMenuItem onClick={() => onEdit(entry)}>
                <PencilIcon />
                Edit note
              </ContextMenuItem>
              <ContextMenuItem variant="destructive" onClick={() => onDelete(entry)}>
                <Trash2Icon />
                Delete note
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>
        ))}
      </ol>
      <ConsoleEnd />
    </>
  )
}
