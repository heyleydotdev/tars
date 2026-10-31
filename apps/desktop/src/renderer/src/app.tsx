import { useEffect, useMemo, useState } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'

import LoadingScreen from './components/loading-screen'
import TitleBar from './components/title-bar'
import { ensureSession, watchSession } from './lib/auth'
import { createAppRouter } from './routes'
import { useAuthStore } from './stores/auth'

const QUERY_STALE_TIME = 30_000

function AppFrame({ children }: React.PropsWithChildren) {
  return (
    <div className="bg-background grid h-svh grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
      <TitleBar />
      {children}
    </div>
  )
}

function Workspace() {
  const [queryClient] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: QUERY_STALE_TIME } } })
  )
  const router = useMemo(() => createAppRouter(queryClient), [queryClient])

  return (
    <QueryClientProvider client={queryClient}>
      <AppFrame>
        <RouterProvider router={router} />
      </AppFrame>
    </QueryClientProvider>
  )
}

export default function App() {
  const session = useAuthStore((state) => state.session)
  const userId = session?.user.id ?? null

  useEffect(() => {
    void ensureSession()

    return watchSession()
  }, [])

  if (session === undefined) {
    return (
      <AppFrame>
        <LoadingScreen />
      </AppFrame>
    )
  }

  // Query keys are not account-scoped. Remounting with a fresh client per
  // account keeps one user's records out of another's cache after a switch.
  return <Workspace key={userId ?? 'guest'} />
}
