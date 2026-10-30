import { toDateKey } from '@tars/core/utils/format'

import ConsoleHeader from './console-header'
import ConsoleStat from './console-stat'
import DeskChatButton from './desk-chat-button'

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
    <ConsoleHeader
      title="journal"
      right={
        <>
          <span className="text-muted-foreground tabular-nums">{toDateKey(new Date())}</span>
          <DeskChatButton />
        </>
      }
    >
      <dl className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <ConsoleStat label="notes" value={String(notes).padStart(2, '0')} tone="text-sky-400" />
        <ConsoleStat
          label="tasks.open"
          value={String(openTasks).padStart(2, '0')}
          tone="text-emerald-400"
        />
        <ConsoleStat
          label="tasks.done"
          value={String(doneTasks).padStart(2, '0')}
          tone="text-muted-foreground"
        />
        <ConsoleStat
          label="reminders"
          value={String(reminders).padStart(2, '0')}
          tone="text-amber-300"
        />
      </dl>
    </ConsoleHeader>
  )
}
