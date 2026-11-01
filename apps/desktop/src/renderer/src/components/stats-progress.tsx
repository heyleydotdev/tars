import { cn } from '@tars/ui/lib/utils'

import { ACTIVITY_STATE_TONES } from '../lib/stats-tones'
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
        <span className="text-foreground font-mono text-xl tabular-nums">{completion}%</span>
        <span className="text-muted-foreground font-mono text-xs tracking-wide uppercase">
          done
        </span>
      </StatsRing>

      <div className="w-full">
        <table className="border-border w-full border-collapse border text-xs">
          <tbody>
            <tr>
              <th
                scope="row"
                className="border-border text-muted-foreground border-r border-b px-2 py-1.5 text-left align-top font-sans font-medium"
              >
                Open tasks
              </th>
              <td className="border-border text-foreground border-r border-b px-2 py-1.5 text-center font-mono text-sky-400 tabular-nums">
                {openTasks}
              </td>
              <th
                scope="row"
                className="border-border text-muted-foreground border-r border-b px-2 py-1.5 text-left align-top font-sans font-medium"
              >
                Done tasks
              </th>
              <td className="border-border text-foreground border-b px-2 py-1.5 text-center font-mono text-emerald-400 tabular-nums">
                {doneTasks}
              </td>
            </tr>
            <tr>
              <th
                scope="row"
                className="border-border text-muted-foreground border-r px-2 py-1.5 text-left align-top font-sans font-medium"
              >
                Pending reminders
              </th>
              <td className="border-border text-foreground border-r px-2 py-1.5 text-center font-mono text-amber-300 tabular-nums">
                {pendingReminders}
              </td>
              <th
                scope="row"
                className="border-border text-muted-foreground border-r px-2 py-1.5 text-left align-top font-sans font-medium"
              >
                Sent reminders
              </th>
              <td className="border-border text-foreground px-2 py-1.5 text-center font-mono tabular-nums">
                {sentReminders}
              </td>
            </tr>
          </tbody>
        </table>

        <div className="mt-4">
          <div className="text-muted-foreground flex items-center justify-between font-mono text-xs tracking-wide uppercase">
            <span>reminders</span>
            <span className="font-mono tabular-nums">{reminderTotal}</span>
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
          <ul className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 font-mono text-xs uppercase">
            {segments.map((segment) => (
              <li key={segment.label} className="flex items-center gap-1.5">
                <StatsSwatch tone={segment.tone} />
                {segment.label}
                <span className="text-foreground font-mono tabular-nums">{segment.count}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  )
}
