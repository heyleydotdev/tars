import type { QueryClient } from '@tanstack/react-query'
import { redirect } from 'react-router'

import { useAuthStore } from '../stores/auth'
import { ensureSession } from './auth'
import { orpc } from './orpc'

async function requireSession(): Promise<void> {
  await ensureSession()

  if (!useAuthStore.getState().session) {
    throw redirect('/login')
  }
}

export function expensesLoader(queryClient: QueryClient) {
  return async () => {
    await requireSession()

    return queryClient.query(orpc.expenses.list.queryOptions())
  }
}

export function journalLoader(queryClient: QueryClient) {
  return async () => {
    await requireSession()

    return queryClient.query(orpc.journal.list.queryOptions())
  }
}

export function statsLoader(queryClient: QueryClient) {
  return async () => {
    await requireSession()

    const [journal, expenses] = await Promise.all([
      queryClient.query(orpc.journal.list.queryOptions()),
      queryClient.query(orpc.expenses.list.queryOptions())
    ])

    return { journal, expenses }
  }
}

export function measureLoader(queryClient: QueryClient) {
  return async () => {
    await requireSession()

    return queryClient.query(orpc.measure.references.queryOptions())
  }
}

export type ExpensesLoaderData = Awaited<ReturnType<ReturnType<typeof expensesLoader>>>
export type JournalLoaderData = Awaited<ReturnType<ReturnType<typeof journalLoader>>>
export type StatsLoaderData = Awaited<ReturnType<ReturnType<typeof statsLoader>>>
export type MeasureLoaderData = Awaited<ReturnType<ReturnType<typeof measureLoader>>>
