import { useQuery } from '@tanstack/react-query'

import { orpc } from './orpc'

export function useUsage() {
  return useQuery(orpc.usage.summary.queryOptions())
}
