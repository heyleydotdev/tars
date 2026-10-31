import type { ReactNode } from 'react'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { formatTime } from '@tars/core/utils/format'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'

export default function JournalRow({
  entry,
  menu,
  children
}: {
  entry: JournalItemOutput
  menu: ReactNode
  children: ReactNode
}) {
  return (
    <ContextMenu>
      <ContextMenuTrigger
        render={
          <li className="hover:bg-muted grid grid-cols-[5rem_minmax(0,1fr)] gap-3 px-3 py-3 transition-colors" />
        }
      >
        <time
          dateTime={entry.occurredAt}
          className="text-muted-foreground pt-0.5 font-mono text-xs/6 tabular-nums"
        >
          {formatTime(entry.occurredAt)}
        </time>
        <div className="min-w-0">{children}</div>
      </ContextMenuTrigger>
      <ContextMenuContent>{menu}</ContextMenuContent>
    </ContextMenu>
  )
}
