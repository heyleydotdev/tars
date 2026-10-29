import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import type {
  JournalPageOutput,
  RecordDoneInput,
  RecordDoneOutput
} from '@tars/core/schemas/journal'

import { orpc } from './orpc'

const journalKey = orpc.journal.list.queryKey()

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

export function useJournal() {
  return useQuery(orpc.journal.list.queryOptions())
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
