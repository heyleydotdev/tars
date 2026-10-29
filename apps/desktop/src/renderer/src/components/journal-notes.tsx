import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { toDateKey } from '@tars/core/utils/format'

import { ConsoleEmpty } from './console-panel'

export default function JournalNotes({ journals }: { journals: Array<JournalItemOutput> }) {
  if (journals.length === 0) {
    return <ConsoleEmpty title="no entries" hint="tell tars about your day" />
  }

  return (
    <ol className="divide-border divide-y">
      {journals.map((entry) => (
        <li
          key={entry.id}
          className="hover:bg-muted/20 grid grid-cols-[5rem_minmax(0,1fr)] gap-3 px-3 py-3 transition-colors"
        >
          <time
            dateTime={entry.occurredAt ?? entry.createdAt}
            className="text-muted-foreground pt-0.5 text-xs tabular-nums"
          >
            {toDateKey(entry.occurredAt ?? entry.createdAt)}
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
              <h3 className="text-foreground text-[13px] font-medium wrap-break-word">
                {entry.title}
              </h3>
            ) : null}
            <p className="text-foreground mt-1 text-[13px] leading-6 wrap-break-word whitespace-pre-line select-text">
              {entry.content}
            </p>
          </div>
        </li>
      ))}
    </ol>
  )
}
