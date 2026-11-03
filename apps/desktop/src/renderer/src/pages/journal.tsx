import { useEffect, useMemo, useRef, useState } from 'react'
import { useLoaderData } from 'react-router'

import type {
  JournalItemOutput,
  JournalPageOutput,
  ReminderItemOutput,
  TodoItemOutput
} from '@tars/core/schemas/journal'
import { ERRORS } from '@tars/core/errors'
import { toDateKey } from '@tars/core/utils/format'
import { Button } from '@tars/ui/components/button'
import { ButtonGroup } from '@tars/ui/components/button-group'

import type { JournalFeedMode } from '../components/journal-feed'
import type { JournalLoaderData } from '../lib/loaders'
import ConfirmDialog from '../components/confirm-dialog'
import ConsolePanel from '../components/console-panel'
import JournalAgenda from '../components/journal-agenda'
import JournalCalendar from '../components/journal-calendar'
import JournalEditDialog from '../components/journal-edit-dialog'
import JournalFeed from '../components/journal-feed'
import JournalStats from '../components/journal-stats'
import ReminderEditDialog from '../components/reminder-edit-dialog'
import TodoEditDialog from '../components/todo-edit-dialog'
import {
  useDeleteJournalEntry,
  useDeleteReminder,
  useDeleteTodo,
  useJournal,
  useJournalActivity,
  useJournalNotes,
  useLogActivity,
  useRemoveReminderActivity,
  useRemoveTaskActivity,
  useSetReminderDone,
  useSetTodoDone
} from '../lib/journal'
import { useShellAlertStore } from '../stores/alert'

const EMPTY_TODOS: JournalPageOutput['todos'] = []
const EMPTY_REMINDERS: JournalPageOutput['reminders'] = []
const EMPTY_JOURNALS: JournalPageOutput['journals'] = []
const EMPTY_ACTIVITIES: JournalPageOutput['journals'] = []

export default function Journal() {
  const initial = useLoaderData<JournalLoaderData>()
  const [selected, setSelected] = useState(() => new Date())
  const [filter, setFilter] = useState<JournalFeedMode>('all')
  const taskQueue = useRef(new Map<string, Promise<void>>())
  const [editingJournal, setEditingJournal] = useState<JournalItemOutput | null>(null)
  const [editingTodo, setEditingTodo] = useState<TodoItemOutput | null>(null)
  const [editingReminder, setEditingReminder] = useState<ReminderItemOutput | null>(null)
  const [deleteTarget, setDeleteTarget] = useState<{
    kind: 'journal' | 'todo' | 'reminder'
    id: string
  } | null>(null)
  const journal = useJournal(initial)
  const dayRange = useMemo(() => {
    const start = new Date(selected)

    start.setHours(0, 0, 0, 0)

    const end = new Date(start)

    end.setDate(end.getDate() + 1)

    return { from: start.toISOString(), to: new Date(end.getTime() - 1).toISOString() }
  }, [selected])
  const activity = useJournalActivity(dayRange.from, dayRange.to, filter !== 'notes')
  const notes = useJournalNotes(dayRange.from, dayRange.to)
  const logActivity = useLogActivity()
  const removeTaskActivity = useRemoveTaskActivity()
  const removeReminderActivity = useRemoveReminderActivity()
  const setTodoDone = useSetTodoDone()
  const setReminderDone = useSetReminderDone()
  const deleteJournal = useDeleteJournalEntry()
  const deleteTodo = useDeleteTodo()
  const deleteReminder = useDeleteReminder()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const todos = journal.data?.todos ?? EMPTY_TODOS
  const reminders = journal.data?.reminders ?? EMPTY_REMINDERS
  const journals = journal.data?.journals ?? EMPTY_JOURNALS
  const dayNotes = notes.data?.items ?? EMPTY_JOURNALS
  const activities = activity.data?.items ?? EMPTY_ACTIVITIES
  const visibleCount =
    filter === 'notes'
      ? dayNotes.length
      : filter === 'activities'
        ? activities.length
        : dayNotes.length + activities.length
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
      title: ERRORS.refreshFailed,
      description: ERRORS.lastLoadedJournal,
      variant: 'destructive'
    })
  }, [journal.data, journal.isError, showAlert])

  useEffect(() => {
    if (!setTodoDone.isError && !setReminderDone.isError) return

    showAlert({
      title: ERRORS.updateFailed,
      description: ERRORS.changeRolledBack,
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

  async function persistTodoToggle(id: string, done: boolean): Promise<void> {
    try {
      await setTodoDone.mutateAsync({ id, done })
    } catch {
      return
    }

    if (!done) {
      await removeTaskActivity.mutateAsync({ todoId: id }).catch(() => undefined)
      return
    }

    const todo = todos.find((item) => item.id === id)

    if (!todo) return

    await logActivity
      .mutateAsync({
        events: [
          {
            type: 'task.done',
            todoId: id,
            title: todo.title,
            dayKey: toDateKey(new Date()),
            occurredAt: new Date().toISOString()
          }
        ]
      })
      .catch(() => undefined)
  }

  function toggleTodo(id: string, done: boolean): void {
    const previous = taskQueue.current.get(id) ?? Promise.resolve()
    const next = previous.then(() => persistTodoToggle(id, done)).catch(() => undefined)

    taskQueue.current.set(id, next)
  }

  async function confirmDelete() {
    if (!deleteTarget) return

    try {
      if (deleteTarget.kind === 'journal') {
        await deleteJournal.mutateAsync({ id: deleteTarget.id })
      } else if (deleteTarget.kind === 'todo') {
        await deleteTodo.mutateAsync({ id: deleteTarget.id })
        logActivity.mutate({
          events: [
            {
              type: 'action',
              action: 'task.deleted',
              entityId: deleteTarget.id,
              title: deleteSubject,
              detail: null,
              occurredAt: new Date().toISOString()
            }
          ]
        })
      } else {
        await deleteReminder.mutateAsync({ id: deleteTarget.id })
        logActivity.mutate({
          events: [
            {
              type: 'action',
              action: 'reminder.deleted',
              entityId: deleteTarget.id,
              title: deleteSubject,
              detail: null,
              occurredAt: new Date().toISOString()
            }
          ]
        })
      }

      setDeleteTarget(null)
    } catch {
      showAlert({
        title: ERRORS.deleteFailed,
        description: ERRORS.nothingRemoved,
        variant: 'destructive'
      })
    }
  }

  return (
    <>
      <div className="flex min-h-full flex-col lg:h-full lg:min-h-0 lg:overflow-hidden">
        <JournalStats
          notes={journals.length}
          openTasks={openTasks}
          doneTasks={doneTasks}
          reminders={pendingReminders}
        />

        <div className="bg-border grid flex-1 grid-cols-1 gap-px lg:min-h-0 lg:grid-cols-[minmax(0,1.25fr)_minmax(20rem,0.75fr)]">
          <ConsolePanel
            title="notes.md"
            count={String(visibleCount)}
            accent="bg-sky-400"
            headerRight={
              <ButtonGroup>
                {(['all', 'notes', 'activities'] as const).map((mode) => (
                  <Button
                    key={mode}
                    type="button"
                    size="xs"
                    variant={filter === mode ? 'default' : 'outline'}
                    onClick={() => setFilter(mode)}
                  >
                    {mode === 'all' ? 'All' : mode === 'notes' ? 'Notes' : 'Activities'}
                  </Button>
                ))}
              </ButtonGroup>
            }
          >
            <JournalFeed
              mode={filter}
              notes={dayNotes}
              activities={activities}
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
                onToggleReminder={(id, done) => {
                  const reminder = reminders.find((item) => item.id === id)

                  setReminderDone.mutate(
                    { id, done },
                    {
                      onSuccess: () => {
                        if (done) {
                          logActivity.mutate({
                            events: [
                              {
                                type: 'action',
                                action: 'reminder.done',
                                entityId: id,
                                title: reminder?.title ?? 'Reminder',
                                detail: null,
                                occurredAt: new Date().toISOString()
                              }
                            ]
                          })

                          return
                        }

                        removeReminderActivity.mutate({ reminderId: id })
                      }
                    }
                  )
                }}
                onToggleTodo={toggleTodo}
                onEditReminder={editReminder}
                onEditTodo={editTodo}
                onDeleteReminder={(id) => setDeleteTarget({ kind: 'reminder', id })}
                onDeleteTodo={(id) => setDeleteTarget({ kind: 'todo', id })}
              />
            </ConsolePanel>
          </div>
        </div>
      </div>

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
    </>
  )
}
