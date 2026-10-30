import { useEffect, useMemo, useState } from 'react'

import type {
  JournalItemOutput,
  JournalPageOutput,
  ReminderItemOutput,
  TodoItemOutput
} from '@tars/core/schemas/journal'
import { toDateKey } from '@tars/core/utils/format'

import ConfirmDialog from '../components/confirm-dialog'
import ConsolePanel from '../components/console-panel'
import DashboardShell from '../components/dashboard-shell'
import JournalAgenda from '../components/journal-agenda'
import JournalCalendar from '../components/journal-calendar'
import JournalEditDialog from '../components/journal-edit-dialog'
import JournalNotes from '../components/journal-notes'
import JournalStats from '../components/journal-stats'
import LoadingScreen from '../components/loading-screen'
import PageError from '../components/page-error'
import ReminderEditDialog from '../components/reminder-edit-dialog'
import TodoEditDialog from '../components/todo-edit-dialog'
import {
  useDeleteJournalEntry,
  useDeleteReminder,
  useDeleteTodo,
  useJournal,
  useSetReminderDone,
  useSetTodoDone
} from '../lib/journal'
import { useShellAlertStore } from '../stores/alert'

const EMPTY_TODOS: JournalPageOutput['todos'] = []
const EMPTY_REMINDERS: JournalPageOutput['reminders'] = []
const EMPTY_JOURNALS: JournalPageOutput['journals'] = []

export default function Journal() {
  const [selected, setSelected] = useState(() => new Date())
  const [editingJournal, setEditingJournal] = useState<JournalItemOutput | null>(null)
  const [editingTodo, setEditingTodo] = useState<TodoItemOutput | null>(null)
  const [editingReminder, setEditingReminder] = useState<ReminderItemOutput | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'journal' | 'todo' | 'reminder'
    id: string
  } | null>(null)
  const journal = useJournal()
  const setTodoDone = useSetTodoDone()
  const setReminderDone = useSetReminderDone()
  const deleteJournal = useDeleteJournalEntry()
  const deleteTodo = useDeleteTodo()
  const deleteReminder = useDeleteReminder()
  const showAlert = useShellAlertStore((state) => state.showAlert)
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

  useEffect(() => {
    if (!journal.isError || !journal.data) return

    showAlert({
      title: 'Refresh failed',
      description: 'Showing the last loaded journal.',
      variant: 'destructive'
    })
  }, [journal.data, journal.isError, showAlert])

  useEffect(() => {
    if (!setTodoDone.isError && !setReminderDone.isError) return

    showAlert({
      title: 'Update failed',
      description: 'Your change was rolled back. Try again.',
      variant: 'destructive'
    })
  }, [setReminderDone.isError, setTodoDone.isError, showAlert])

  function editTodo(id: string) {
    const todo = todos.find((item) => item.id === id)

    if (todo) setEditingTodo(todo)
  }

  function editReminder(id: string) {
    const reminder = reminders.find((item) => item.id === id)

    if (reminder) setEditingReminder(reminder)
  }

  const deleteEntry =
    deleteTarget?.kind === 'journal'
      ? journals.find((entry) => entry.id === deleteTarget.id)
      : undefined
  const deleteSubject =
    deleteTarget?.kind === 'journal'
      ? (deleteEntry?.title ?? deleteEntry?.content.slice(0, 48) ?? 'this note')
      : deleteTarget?.kind === 'todo'
        ? (todos.find((item) => item.id === deleteTarget.id)?.title ?? 'this task')
        : deleteTarget?.kind === 'reminder'
          ? (reminders.find((item) => item.id === deleteTarget.id)?.title ?? 'this reminder')
          : ''

  const deletePending = deleteJournal.isPending || deleteTodo.isPending || deleteReminder.isPending

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      if (deleteTarget.kind === 'journal') {
        await deleteJournal.mutateAsync({ id: deleteTarget.id })
      } else if (deleteTarget.kind === 'todo') {
        await deleteTodo.mutateAsync({ id: deleteTarget.id })
      } else {
        await deleteReminder.mutateAsync({ id: deleteTarget.id })
      }

      setDeleteTarget(null)
    } catch {
      showAlert({
        title: 'Delete failed',
        description: 'Nothing was removed. Try again.',
        variant: 'destructive'
      })
    }
  }

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
                <JournalNotes
                  journals={journals}
                  onEdit={setEditingJournal}
                  onDelete={(entry) => setDeleteTarget({ kind: 'journal', id: entry.id })}
                />
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
                  <JournalAgenda
                    reminders={dayReminders}
                    todos={dayTodos}
                    onToggleReminder={(id, done) => setReminderDone.mutate({ id, done })}
                    onToggleTodo={(id, done) => setTodoDone.mutate({ id, done })}
                    onEditReminder={editReminder}
                    onEditTodo={editTodo}
                    onDeleteReminder={(id) => setDeleteTarget({ kind: 'reminder', id })}
                    onDeleteTodo={(id) => setDeleteTarget({ kind: 'todo', id })}
                  />
                </ConsolePanel>
              </div>
            </div>
          )}
        </div>
      )}

      {editingJournal ? (
        <JournalEditDialog
          key={editingJournal.id}
          entry={editingJournal}
          open
          onOpenChange={(open) => {
            if (!open) setEditingJournal(null)
          }}
        />
      ) : null}

      {editingTodo ? (
        <TodoEditDialog
          key={editingTodo.id}
          todo={editingTodo}
          open
          onOpenChange={(open) => {
            if (!open) setEditingTodo(null)
          }}
        />
      ) : null}

      {editingReminder ? (
        <ReminderEditDialog
          key={editingReminder.id}
          reminder={editingReminder}
          open
          onOpenChange={(open) => {
            if (!open) setEditingReminder(null)
          }}
        />
      ) : null}

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        pending={deletePending}
        title={
          deleteTarget?.kind === 'journal'
            ? 'Delete note?'
            : deleteTarget?.kind === 'todo'
              ? 'Delete task?'
              : 'Delete reminder?'
        }
        description={`"${deleteSubject}" will be permanently removed.`}
        confirmLabel="Delete"
        destructive
        onOpenChange={(open) => {
          if (!open) setDeleteTarget(null)
        }}
        onConfirm={() => void confirmDelete()}
      />
    </DashboardShell>
  )
}
