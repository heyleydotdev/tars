import { cn } from '@tars/ui/lib/utils'

import type { ActivitySummary } from '../lib/stats'
import { dayLabel } from '../lib/stats'
import StatsMetric from './stats-metric'
import StatsSwatch from './stats-swatch'

const LEVELS = [
  'border border-border bg-muted/30',
  'bg-emerald-900',
  'bg-emerald-700',
  'bg-emerald-500',
  'bg-emerald-300'
]

const WEEKDAYS = ['', 'mon', '', 'wed', '', 'fri', '']

function level(count: number): number {
  if (count === 0) return 0
  if (count === 1) return 1
  if (count <= 3) return 2
  if (count <= 5) return 3

  return 4
}

export default function StatsHeatmap({ activity }: { activity: ActivitySummary }) {
  const start = activity.cells[0]?.date
  const end = [...activity.cells].reverse().find((cell) => !cell.future)?.date

  return (
    <div className="p-3">
      <div className="text-muted-foreground flex items-center justify-between gap-4 text-xs">
        <span className="tabular-nums">
          {start ? dayLabel(start) : '—'} → {end ? dayLabel(end) : '—'}
        </span>
        <span className="tabular-nums">{activity.total} records</span>
      </div>

      <div className="mt-3 flex gap-2">
        <div className="grid grid-rows-7 gap-0.5">
          {WEEKDAYS.map((weekday, index) => (
            <span
              key={index}
              className="text-muted-foreground flex h-5 items-center text-[10px] uppercase"
            >
              {weekday}
            </span>
          ))}
        </div>
        <div className="grid min-w-0 flex-1 auto-cols-fr grid-flow-col grid-rows-7 gap-0.5">
          {activity.cells.map((cell) => (
            <div
              key={cell.key}
              title={
                cell.future
                  ? undefined
                  : `${cell.key} · ${cell.count} ${cell.count === 1 ? 'record' : 'records'}`
              }
              aria-hidden
              className={cn('h-5 w-full', cell.future ? 'bg-muted' : LEVELS[level(cell.count)])}
            />
          ))}
        </div>
      </div>

      <div className="text-muted-foreground mt-3 flex items-center gap-1.5 text-xs">
        <span>less</span>
        {LEVELS.map((tone) => (
          <StatsSwatch key={tone} tone={tone} className="size-2.5" />
        ))}
        <span>more</span>
      </div>

      <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-2 text-xs">
        <StatsMetric label="active days" value={activity.activeDays} />
        <StatsMetric label="streak" value={`${activity.streak}d`} tone="text-emerald-400" />
        <StatsMetric
          label="busiest"
          value={
            activity.busiest
              ? `${activity.busiest.count} · ${dayLabel(activity.busiest.date)}`
              : '—'
          }
        />
        <StatsMetric
          label="avg.active"
          value={
            activity.activeDays > 0 ? (activity.total / activity.activeDays).toFixed(1) : '0.0'
          }
          tone="text-sky-400"
        />
      </dl>
    </div>
  )
}
