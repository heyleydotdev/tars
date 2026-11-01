import type { ReactNode } from 'react'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { formatTime } from '@tars/core/utils/format'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuTrigger
} from '@tars/ui/components/context-menu'

import { activateRow } from '../lib/row-activation'

export default function JournalRow({
  entry,
  menu,
  onOpen,
  children
}: {
  entry: JournalItemOutput
  menu: ReactNode
  onOpen?: () => void
  children: ReactNode
}) {
  const content = (
    <>
      <time
        dateTime={entry.occurredAt}
        className="text-muted-foreground pt-0.5 font-mono text-xs/6 tabular-nums"
      >
        {formatTime(entry.occurredAt)}
      </time>
      <div className="min-w-0">{children}</div>
    </>
  )

  return (
    <ContextMenu>
      <ContextMenuTrigger render={<li className="hover:bg-muted transition-colors" />}>
        {onOpen ? (
          <button
            type="button"
            {...activateRow(onOpen)}
            className="grid w-full grid-cols-[5rem_minmax(0,1fr)] gap-3 px-3 py-3 text-left select-text focus-visible:outline-none"
          >
            {content}
          </button>
        ) : (
          <div className="grid grid-cols-[5rem_minmax(0,1fr)] gap-3 px-3 py-3">{content}</div>
        )}
      </ContextMenuTrigger>
      <ContextMenuContent>{menu}</ContextMenuContent>
    </ContextMenu>
  )
}
