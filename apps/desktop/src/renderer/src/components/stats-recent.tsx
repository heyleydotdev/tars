import { useState } from 'react'

import { formatDateTime, formatTime } from '@tars/core/utils/format'

import type { ActivityEvent, ActivityKind } from '../lib/stats'
import { activateRow } from '../lib/row-activation'
import { ACTIVITY_KIND_LABELS } from '../lib/stats-tones'
import EmptyState from './empty-state'
import StatsActivityDialog from './stats-activity-dialog'

const KIND_TONES: Record<ActivityKind, string> = {
  note: 'text-sky-400',
  expense: 'text-emerald-400',
  task: 'text-violet-400',
  reminder: 'text-amber-300'
}

export default function StatsRecent({ events }: { events: Array<ActivityEvent> }) {
  const [selected, setSelected] = useState<ActivityEvent | null>(null)
  const [open, setOpen] = useState(false)

  if (events.length === 0) {
    return <EmptyState title="No Activity" hint="Records will show up here." />
  }

  return (
    <>
      <ol className="bg-border grid grid-cols-1 gap-px sm:grid-cols-2">
        {events.map((event) => (
          <li key={event.id} className="bg-background hover:bg-muted transition-colors">
            <button
              type="button"
              {...activateRow(() => {
                setSelected(event)
                setOpen(true)
              })}
              className="focus-visible:bg-muted grid w-full grid-cols-[2.5rem_2.5rem_minmax(0,1fr)] items-baseline gap-2 px-3 py-2 text-left text-xs focus-visible:outline-none"
            >
              <time
                dateTime={event.at}
                title={formatDateTime(event.at)}
                className="text-muted-foreground font-mono tabular-nums"
              >
                {formatTime(event.at)}
              </time>
              <span className={KIND_TONES[event.kind]}>{ACTIVITY_KIND_LABELS[event.kind]}</span>
              <span className="text-foreground min-w-0 truncate font-sans" title={event.title}>
                {event.title}
              </span>
            </button>
          </li>
        ))}
      </ol>
      <StatsActivityDialog event={selected} open={open} onOpenChange={setOpen} />
    </>
  )
}
