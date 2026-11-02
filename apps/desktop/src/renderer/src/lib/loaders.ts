import type { QueryClient } from '@tanstack/react-query'
import type { LoaderFunctionArgs } from 'react-router'
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

export function incidentsLoader(queryClient: QueryClient) {
  return async () => {
    await requireSession()

    return queryClient.query(orpc.incident.list.queryOptions())
  }
}

export function blueprintsLoader(queryClient: QueryClient) {
  return async () => {
    await requireSession()

    return queryClient.query(orpc.blueprint.list.queryOptions())
  }
}

export function blueprintLoader(queryClient: QueryClient) {
  return async ({ params }: LoaderFunctionArgs) => {
    await requireSession()

    return queryClient.query(orpc.blueprint.get.queryOptions({ input: { id: params.id ?? '' } }))
  }
}

export function incidentLoader(queryClient: QueryClient) {
  return async ({ params }: LoaderFunctionArgs) => {
    await requireSession()

    return queryClient.query(
      orpc.incident.get.queryOptions({ input: { incidentId: params.id ?? '' } })
    )
  }
}

export type ExpensesLoaderData = Awaited<ReturnType<ReturnType<typeof expensesLoader>>>
export type JournalLoaderData = Awaited<ReturnType<ReturnType<typeof journalLoader>>>
export type StatsLoaderData = Awaited<ReturnType<ReturnType<typeof statsLoader>>>
export type MeasureLoaderData = Awaited<ReturnType<ReturnType<typeof measureLoader>>>
export type IncidentsLoaderData = Awaited<ReturnType<ReturnType<typeof incidentsLoader>>>
export type IncidentLoaderData = Awaited<ReturnType<ReturnType<typeof incidentLoader>>>
export type BlueprintsLoaderData = Awaited<ReturnType<ReturnType<typeof blueprintsLoader>>>
export type BlueprintLoaderData = Awaited<ReturnType<ReturnType<typeof blueprintLoader>>>
