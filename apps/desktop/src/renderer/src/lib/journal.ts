import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  JournalPageOutput,
  LogActivityInput,
  RecordDoneInput,
  RecordDoneOutput,
  RemoveTaskActivityInput,
  UpdateJournalInput,
  UpdateReminderInput,
  UpdateTodoInput
} from '@tars/core/schemas/journal'
import type { DeleteRecordInput, DeleteRecordOutput } from '@tars/core/schemas/records'

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
    onSuccess: () => invalidateJournal(queryClient)
  })
}

export function useRemoveTaskActivity() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RemoveTaskActivityInput) => orpc.journal.removeTaskActivity.call(input),
    onSuccess: () => invalidateJournal(queryClient)
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
