import { toDateKey } from '@tars/core/utils/format'

import { STAT_COLORS } from '../lib/stats-tones'
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
          <span className="text-muted-foreground font-mono tabular-nums">
            {toDateKey(new Date())}
          </span>
          <DeskChatButton />
        </>
      }
    >
      <dl className="flex flex-wrap items-center gap-1.5">
        <ConsoleStat label="notes" value={String(notes).padStart(2, '0')} color={STAT_COLORS.sky} />
        <ConsoleStat
          label="tasks.open"
          value={String(openTasks).padStart(2, '0')}
          color={STAT_COLORS.emerald}
        />
        <ConsoleStat
          label="tasks.done"
          value={String(doneTasks).padStart(2, '0')}
          color={STAT_COLORS.muted}
        />
        <ConsoleStat
          label="reminders"
          value={String(reminders).padStart(2, '0')}
          color={STAT_COLORS.amber}
        />
      </dl>
    </ConsoleHeader>
  )
}
