import { formatTime, toDateKey } from '@tars/core/utils/format'
import { Tooltip, TooltipContent, TooltipTrigger } from '@tars/ui/components/tooltip'
import { cn } from '@tars/ui/lib/utils'

import type { ActivityEvent, ActivityKind, ActivityState } from '../lib/stats'
import { ACTIVITY_STATE_TONES } from '../lib/stats-tones'
import EmptyState from './empty-state'

const KIND_LABELS: Record<ActivityKind, string> = {
  note: 'NOTE',
  expense: 'EXP',
  task: 'TASK',
  reminder: 'REM'
}

const KIND_TONES: Record<ActivityKind, string> = {
  note: 'text-sky-400',
  expense: 'text-emerald-400',
  task: 'text-violet-400',
  reminder: 'text-amber-300'
}

const STATE_LABELS: Record<ActivityState, string> = {
  open: 'Open',
  done: 'Done',
  pending: 'Pending',
  sent: 'Sent',
  dismissed: 'Dismissed'
}

function timeLabel(at: string, todayKey: string): string {
  const key = toDateKey(at)

  return key === todayKey ? formatTime(at) : key.slice(5)
}

export default function StatsRecent({ events }: { events: Array<ActivityEvent> }) {
  if (events.length === 0) {
    return <EmptyState title="No Activity" hint="Records will show up here." />
  }

  const todayKey = toDateKey(new Date())

  return (
    <ol className="bg-border grid grid-cols-1 gap-px sm:grid-cols-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="bg-background grid grid-cols-[2.5rem_2.5rem_minmax(0,1fr)_auto] items-baseline gap-2 px-3 py-2 text-xs"
        >
          <time dateTime={event.at} className="text-muted-foreground tabular-nums">
            {timeLabel(event.at, todayKey)}
          </time>
          <span className={KIND_TONES[event.kind]}>{KIND_LABELS[event.kind]}</span>
          <span className="min-w-0">
            <span className="text-foreground block truncate font-sans" title={event.title}>
              {event.title}
            </span>
            {event.meta ? (
              <span className="text-muted-foreground block truncate text-xs">{event.meta}</span>
            ) : null}
          </span>
          <span className="flex justify-end self-start pt-1">
            {event.state ? (
              <Tooltip>
                <TooltipTrigger
                  render={
                    <span
                      tabIndex={0}
                      aria-label={STATE_LABELS[event.state]}
                      className={cn(
                        'border-border size-2 border',
                        ACTIVITY_STATE_TONES[event.state]
                      )}
                    />
                  }
                />
                <TooltipContent side="left">{STATE_LABELS[event.state]}</TooltipContent>
              </Tooltip>
            ) : null}
          </span>
        </li>
      ))}
    </ol>
  )
}
