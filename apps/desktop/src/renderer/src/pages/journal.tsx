import { useMemo, useState } from 'react'

import type { JournalPageOutput } from '@tars/core/schemas/journal'
import { toDateKey } from '@tars/core/utils/format'

import ConsolePanel from '../components/console-panel'
import DashboardShell from '../components/dashboard-shell'
import JournalAgenda from '../components/journal-agenda'
import JournalCalendar from '../components/journal-calendar'
import JournalNotes from '../components/journal-notes'
import JournalStats from '../components/journal-stats'
import LoadingScreen from '../components/loading-screen'
import PageError from '../components/page-error'
import { useJournal, useSetReminderDone, useSetTodoDone } from '../lib/journal'

const EMPTY_TODOS: JournalPageOutput['todos'] = []
const EMPTY_REMINDERS: JournalPageOutput['reminders'] = []
const EMPTY_JOURNALS: JournalPageOutput['journals'] = []

export default function Journal() {
  const [selected, setSelected] = useState(() => new Date())
  const journal = useJournal()
  const setTodoDone = useSetTodoDone()
  const setReminderDone = useSetReminderDone()
  const todos = journal.data?.todos ?? EMPTY_TODOS
  const reminders = journal.data?.reminders ?? EMPTY_REMINDERS
  const journals = journal.data?.journals ?? EMPTY_JOURNALS
  const { openTasks, doneTasks, pendingReminders, dayReminders, dayTodos } = useMemo(() => {
    const key = toDateKey(selected)
    const dayReminders: JournalPageOutput['reminders'] = []
    const dayTodos: JournalPageOutput['todos'] = []
    let openTasks = 0
    let pendingReminders = 0

    for (const todo of todos) {
      if (!todo.done) openTasks += 1
      if (todo.dueAt && toDateKey(todo.dueAt) === key) dayTodos.push(todo)
    }

    for (const reminder of reminders) {
      if (reminder.status === 'pending') pendingReminders += 1
      if (toDateKey(reminder.remindAt) === key) dayReminders.push(reminder)
    }

    return {
      openTasks,
      doneTasks: todos.length - openTasks,
      pendingReminders,
      dayReminders,
      dayTodos
    }
  }, [reminders, todos, selected])
  const agendaCount = dayReminders.length + dayTodos.length

  return (
    <DashboardShell>
      {journal.isPending ? (
        <LoadingScreen />
      ) : (
        <div className="flex min-h-full flex-col font-mono lg:h-full lg:min-h-0 lg:overflow-hidden">
          <JournalStats
            notes={journals.length}
            openTasks={openTasks}
            doneTasks={doneTasks}
            reminders={pendingReminders}
          />

          {journal.isError && !journal.data ? (
            <PageError onRetry={() => void journal.refetch()} />
          ) : (
            <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
              <ConsolePanel title="notes.md" count={String(journals.length)} accent="bg-sky-400">
                <JournalNotes journals={journals} />
              </ConsolePanel>

              <div className="bg-border flex flex-col gap-px lg:min-h-0">
                <ConsolePanel
                  title="reminders.cal"
                  count={String(reminders.length)}
                  accent="bg-amber-400"
                  className="lg:flex-none"
                >
                  <JournalCalendar
                    selected={selected}
                    onSelect={setSelected}
                    reminders={reminders}
                    todos={todos}
                  />
                </ConsolePanel>

                <ConsolePanel
                  title="agenda.log"
                  count={String(agendaCount)}
                  accent="bg-violet-400"
                  className="lg:min-h-0 lg:flex-1"
                >
                  {setTodoDone.isError || setReminderDone.isError ? (
                    <p role="status" className="text-destructive border-b px-3 py-1 text-xs">
                      // update failed
                    </p>
                  ) : null}
                  <JournalAgenda
                    reminders={dayReminders}
                    todos={dayTodos}
                    onToggleReminder={(id, done) => setReminderDone.mutate({ id, done })}
                    onToggleTodo={(id, done) => setTodoDone.mutate({ id, done })}
                  />
                </ConsolePanel>
              </div>
            </div>
          )}
        </div>
      )}
    </DashboardShell>
  )
}
