import { toDateKey } from '@tars/core/utils/format'
import { cn } from '@tars/ui/lib/utils'

function Stat({ label, value, tone }: { label: string; value: number; tone?: string }) {
  return (
    <div className="flex items-baseline gap-1.5 text-xs whitespace-nowrap">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className={cn('text-foreground tabular-nums', tone)}>{String(value).padStart(2, '0')}</dd>
    </div>
  )
}

export default function JournalStats({
  notes,
  openTasks,
  doneTasks,
  reminders
}: {
  notes: number
  openTasks: number
  doneTasks: number
  reminders: number
}) {
  return (
    <header className="border-border bg-background/95 sticky top-0 z-20 border-b backdrop-blur">
      <div className="flex min-h-11 flex-wrap items-center gap-x-5 gap-y-2 px-3 py-2 sm:px-4">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-emerald-400">&gt;</span>
          <span className="text-muted-foreground">tars</span>
          <span className="text-muted-foreground">/</span>
          <span className="text-foreground">journal</span>
          <span
            aria-hidden
            className="journal-cursor ml-0.5 inline-block h-3 w-1.5 bg-emerald-400"
          />
        </div>

        <span aria-hidden className="bg-border hidden h-4 w-px sm:block" />

        <dl className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <Stat label="notes" value={notes} tone="text-sky-400" />
          <Stat label="tasks.open" value={openTasks} tone="text-emerald-400" />
          <Stat label="tasks.done" value={doneTasks} tone="text-muted-foreground" />
          <Stat label="reminders" value={reminders} tone="text-amber-300" />
        </dl>

        <div className="text-muted-foreground ml-auto hidden text-xs tabular-nums sm:block">
          {toDateKey(new Date())}
        </div>
      </div>
    </header>
  )
}
