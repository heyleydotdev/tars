import { useEffect } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router'

import TitleBar from './components/title-bar'
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
      <div className="bg-background grid h-svh grid-rows-[auto_minmax(0,1fr)] overflow-hidden">
        <TitleBar />
        <RouterProvider router={router} />
      </div>
    </QueryClientProvider>
  )
}
