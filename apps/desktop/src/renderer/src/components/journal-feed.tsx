import { useMemo } from 'react'

import type { JournalItemOutput } from '@tars/core/schemas/journal'

import ConsoleEnd from './console-end'
import EmptyState from './empty-state'
import JournalActivityRow from './journal-activity-row'
import JournalNoteRow from './journal-note-row'

export type JournalFeedMode = 'all' | 'notes' | 'activities'

type FeedItem =
  { kind: 'note'; entry: JournalItemOutput } | { kind: 'activity'; entry: JournalItemOutput }

export default function JournalFeed({
  mode,
  notes,
  activities,
  onEdit,
  onDelete
}: {
  mode: JournalFeedMode
  notes: Array<JournalItemOutput>
  activities: Array<JournalItemOutput>
  onEdit: (entry: JournalItemOutput) => void
  onDelete: (entry: JournalItemOutput) => void
}) {
  const items = useMemo(() => {
    const list: Array<FeedItem> = []

    if (mode !== 'activities') {
      list.push(...notes.map((entry) => ({ kind: 'note' as const, entry })))
    }

    if (mode !== 'notes') {
      list.push(...activities.map((entry) => ({ kind: 'activity' as const, entry })))
    }

    return list.sort(
      (left, right) => Date.parse(right.entry.occurredAt) - Date.parse(left.entry.occurredAt)
    )
  }, [activities, mode, notes])

  if (items.length === 0) {
    return (
      <EmptyState
        title={
          mode === 'activities'
            ? 'No Activity'
            : mode === 'notes'
              ? 'No Notes'
              : 'Nothing for this day'
        }
        hint={
          mode === 'activities'
            ? 'Tasks, incidents, and measurements land here as you work.'
            : mode === 'notes'
              ? 'Tell TARS about your day.'
              : 'Add a note or do something worth logging.'
        }
      />
    )
  }

  return (
    <>
      <ol className="divide-border divide-y">
        {items.map((item) =>
          item.kind === 'note' ? (
            <JournalNoteRow
              key={item.entry.id}
              entry={item.entry}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ) : (
            <JournalActivityRow key={item.entry.id} entry={item.entry} />
          )
        )}
      </ol>
      <ConsoleEnd />
    </>
  )
}
