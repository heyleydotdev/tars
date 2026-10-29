import { useEffect, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'

import TitleBar from './components/title-bar'
import { restoreSession, watchSession } from './lib/auth'
import { router } from './routes'
import { useAuthStore } from './stores/auth'

function Workspace() {
  const [queryClient] = useState(() => new QueryClient())

  return (
    <QueryClientProvider client={queryClient}>
      <div className="bg-background grid h-svh grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <TitleBar />
        <RouterProvider router={router} />
      </div>
    </QueryClientProvider>
  )
}

export default function App() {
  const userId = useAuthStore((state) => state.session?.user.id ?? null)

  useEffect(() => {
    void restoreSession()

    return watchSession()
  }, [])

  // Query keys are not account-scoped. Remounting with a fresh client per
  // account keeps one user's records out of another's cache after a switch.
  return <Workspace key={userId ?? 'guest'} />
}
