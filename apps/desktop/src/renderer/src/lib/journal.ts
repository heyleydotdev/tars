import type { Query, QueryKey } from '@tanstack/react-query'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  ActivityEventOutput,
  JournalActivityPageOutput,
  JournalPageOutput,
  LogActivityInput,
  RecordDoneInput,
  RecordDoneOutput,
  RemoveReminderActivityInput,
  RemoveTaskActivityInput,
  UpdateJournalInput,
  UpdateReminderInput,
  UpdateTodoInput
} from '@tars/core/schemas/journal'
import type { DeleteRecordInput, DeleteRecordOutput } from '@tars/core/schemas/records'
import { JOURNAL_ITEM_LIMIT } from '@tars/core/constants'
import { activityContent, activityId, activityTags, activityTitle } from '@tars/core/utils/journal'

import { orpc } from './orpc'

const journalKey = orpc.journal.list.queryKey()

function invalidateJournal(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({
    predicate: (query) => {
      const path = query.queryKey[0]

      return Array.isArray(path) && path[0] === 'journal'
    }
  })
}

function isActivityQuery(query: Query): boolean {
  const path = query.queryKey[0]

  return Array.isArray(path) && path[0] === 'journal' && path[1] === 'activity'
}

function invalidateActivity(queryClient: ReturnType<typeof useQueryClient>): void {
  void queryClient.invalidateQueries({ predicate: isActivityQuery })
}

function useDoneMutation(options: {
  mutate: (input: RecordDoneInput) => Promise<RecordDoneOutput>
  update: (page: JournalPageOutput, input: RecordDoneInput) => JournalPageOutput
}) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: options.mutate,
    onMutate: async (input) => {
      await queryClient.cancelQueries({ queryKey: journalKey })
      const previous = queryClient.getQueryData<JournalPageOutput>(journalKey)

      queryClient.setQueryData<JournalPageOutput>(journalKey, (page) =>
        page ? options.update(page, input) : page
      )

      return { previous }
    },
    onError: (_error, _input, result) => {
      if (result?.previous) {
        queryClient.setQueryData(journalKey, result.previous)
      }
    },
    onSettled: () => void queryClient.invalidateQueries({ queryKey: journalKey })
  })
}

export function useJournal(initialData?: JournalPageOutput) {
  return useQuery({ ...orpc.journal.list.queryOptions(), initialData })
}

export function useJournalActivity(from: string, to: string, enabled = true) {
  return useQuery({
    ...orpc.journal.activity.queryOptions({ input: { from, to } }),
    enabled,
    staleTime: 0
  })
}

export function useJournalNotes(from: string, to: string) {
  return useQuery({ ...orpc.journal.notes.queryOptions({ input: { from, to } }), staleTime: 0 })
}

export function useLogActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: LogActivityInput) => orpc.journal.logActivity.call(input),
    onMutate: (input) => {
      const snapshots = new Map<QueryKey, JournalActivityPageOutput | undefined>()
      const entries = input.events.map((event) => {
        const value = event as ActivityEventOutput

        return {
          id: activityId(value),
          title: activityTitle(value),
          content: activityContent(value),
          mood: null,
          tags: activityTags(value),
          occurredAt: value.occurredAt
        }
      })

      for (const query of queryClient.getQueryCache().findAll({ predicate: isActivityQuery })) {
        const range = (query.queryKey[1] as { input?: { from?: string; to?: string } }).input

        if (!range?.from || !range.to) continue

        const from = Date.parse(range.from)
        const to = Date.parse(range.to)
        const matches = entries.filter((entry) => {
          const at = Date.parse(entry.occurredAt)

          return at >= from && at <= to
        })

        if (matches.length === 0) continue

        snapshots.set(query.queryKey, query.state.data as JournalActivityPageOutput | undefined)

        queryClient.setQueryData<JournalActivityPageOutput>(query.queryKey, (page) => {
          if (!page) return page

          const byId = new Map([...matches, ...page.items].map((item) => [item.id, item]))

          return {
            items: [...byId.values()]
              .sort((left, right) => right.occurredAt.localeCompare(left.occurredAt))
              .slice(0, JOURNAL_ITEM_LIMIT)
          }
        })
      }

      return { snapshots }
    },
    onError: (_error, _input, result) => {
      for (const [key, data] of result?.snapshots ?? []) {
        queryClient.setQueryData(key, data)
      }
    },
    onSuccess: () => invalidateActivity(queryClient)
  })
}

export function useRemoveTaskActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RemoveTaskActivityInput) => orpc.journal.removeTaskActivity.call(input),
    onSuccess: () => invalidateActivity(queryClient)
  })
}

export function useRemoveReminderActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RemoveReminderActivityInput) =>
      orpc.journal.removeReminderActivity.call(input),
    onSuccess: () => invalidateActivity(queryClient)
  })
}

export function useUpdateJournalEntry() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateJournalInput) => orpc.journal.updateEntry.call(input),
    onSuccess: () => invalidateJournal(queryClient)
  })
}

export function useUpdateTodo() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateTodoInput) => orpc.journal.updateTodo.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: journalKey })
  })
}

export function useUpdateReminder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: UpdateReminderInput) => orpc.journal.updateReminder.call(input),
    onSuccess: () => void queryClient.invalidateQueries({ queryKey: journalKey })
  })
}

function useDeleteRecord(mutate: (input: DeleteRecordInput) => Promise<DeleteRecordOutput>) {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: mutate,
    onSuccess: () => invalidateJournal(queryClient)
  })
}

export function useDeleteJournalEntry() {
  return useDeleteRecord((input) => orpc.journal.deleteEntry.call(input))
}

export function useDeleteTodo() {
  return useDeleteRecord((input) => orpc.journal.deleteTodo.call(input))
}

export function useDeleteReminder() {
  return useDeleteRecord((input) => orpc.journal.deleteReminder.call(input))
}

export function useSetTodoDone() {
  return useDoneMutation({
    mutate: (input) => orpc.journal.setTodoDone.call(input),
    update: (page, input) => ({
      ...page,
      todos: page.todos.map((todo) => (todo.id === input.id ? { ...todo, done: input.done } : todo))
    })
  })
}

export function useSetReminderDone() {
  return useDoneMutation({
    mutate: (input) => orpc.journal.setReminderDone.call(input),
    update: (page, input) => ({
      ...page,
      reminders: page.reminders.map((reminder) =>
        reminder.id === input.id
          ? { ...reminder, status: input.done ? 'dismissed' : 'pending' }
          : reminder
      )
    })
  })
}
