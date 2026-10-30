import { cn } from '@tars/ui/lib/utils'

import { ACTIVITY_STATE_TONES } from '../lib/stats-tones'
import StatsMetric from './stats-metric'
import StatsRing from './stats-ring'
import StatsSwatch from './stats-swatch'

export default function StatsProgress({
  openTasks,
  doneTasks,
  pendingReminders,
  sentReminders,
  dismissedReminders
}: {
  openTasks: number
  doneTasks: number
  pendingReminders: number
  sentReminders: number
  dismissedReminders: number
}) {
  const taskTotal = openTasks + doneTasks
  const completion = taskTotal > 0 ? Math.round((doneTasks / taskTotal) * 100) : 0
  const reminderTotal = pendingReminders + sentReminders + dismissedReminders
  const segments = [
    {
      label: 'pending',
      count: pendingReminders,
      tone: ACTIVITY_STATE_TONES.pending
    },
    { label: 'sent', count: sentReminders, tone: ACTIVITY_STATE_TONES.sent },
    {
      label: 'dismissed',
      count: dismissedReminders,
      tone: ACTIVITY_STATE_TONES.dismissed
    }
  ]

  return (
    <div className="flex flex-col items-center gap-5 p-3">
      <StatsRing
        size="size-28"
        label="Tasks completed"
        segments={[{ key: 'done', value: completion, tone: 'stroke-emerald-400' }]}
      >
        <span className="text-foreground text-xl tabular-nums">{completion}%</span>
        <span className="text-muted-foreground text-[10px] tracking-wide uppercase">done</span>
      </StatsRing>

      <div className="w-full">
        <dl className="grid grid-cols-2 gap-x-5 gap-y-2 text-xs">
          <StatsMetric label="tasks.open" value={openTasks} tone="text-sky-400" />
          <StatsMetric label="tasks.done" value={doneTasks} tone="text-emerald-400" />
          <StatsMetric label="rem.pending" value={pendingReminders} tone="text-amber-300" />
          <StatsMetric label="rem.sent" value={sentReminders} />
        </dl>

        <div className="mt-4">
          <div className="text-muted-foreground flex items-center justify-between text-[10px] tracking-wide uppercase">
            <span>reminders</span>
            <span className="tabular-nums">{reminderTotal}</span>
          </div>
          <div className="bg-muted mt-1.5 flex h-1.5 overflow-hidden">
            {segments.map((segment) => (
              <span
                key={segment.label}
                title={`${segment.label}: ${segment.count}`}
                className={cn('h-full', segment.tone)}
                style={{
                  width: `${reminderTotal > 0 ? (segment.count / reminderTotal) * 100 : 0}%`
                }}
              />
            ))}
          </div>
          <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[10px] uppercase">
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center gap-1.5">
                <StatsSwatch tone={segment.tone} />
                {segment.label}
                <span className="text-foreground tabular-nums">{segment.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
