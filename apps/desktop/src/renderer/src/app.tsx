import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'

import { restoreSession, watchSession } from './lib/auth'
import { router } from './routes'

const queryClient = new QueryClient()

export default function App() {
  useEffect(() => {
    void restoreSession()

    return watchSession()
  }, [])

  return (
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>
  )
}
