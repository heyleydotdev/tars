import type { QueryClient } from '@tanstack/react-query'
import { create } from 'zustand'

import { seedIncidentDemo } from '../lib/incident-demo'
import { orpc } from '../lib/orpc'

type IncidentDemoStore = {
  running: boolean
  done: number
  total: number
  incidentId: string | null
  start: (queryClient: QueryClient) => Promise<string | null>
  consumeIncidentId: () => string | null
}

function invalidateIncidentQueries(queryClient: QueryClient, incidentId: string | null): void {
  void queryClient.invalidateQueries({ queryKey: orpc.incident.list.queryKey() })

  if (!incidentId) return

  void queryClient.invalidateQueries({
    queryKey: orpc.incident.get.queryKey({ input: { incidentId } })
  })
}

export const useIncidentDemoStore = create<IncidentDemoStore>()((set, get) => ({
  running: false,
  done: 0,
  total: 0,
  incidentId: null,
  start: async (queryClient) => {
    if (get().running) return null

    set({ running: true, done: 0, total: 0, incidentId: null })

    try {
      const incidentId = await seedIncidentDemo(({ done, total, incidentId: id }) => {
        set({ done, total, incidentId: id })
        invalidateIncidentQueries(queryClient, id)
      })

      set({ incidentId })

      return incidentId
    } finally {
      set({ running: false })
      invalidateIncidentQueries(queryClient, get().incidentId)
    }
  },
  consumeIncidentId: () => {
    const incidentId = get().incidentId

    set({ incidentId: null })

    return incidentId
  }
}))
