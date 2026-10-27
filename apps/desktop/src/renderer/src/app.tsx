import { useEffect } from 'react'
import { RouterProvider } from 'react-router'

import { restoreSession, watchSession } from './lib/auth'
import { router } from './routes'

export default function App() {
  useEffect(() => {
    void restoreSession()

    return watchSession()
  }, [])

  return <RouterProvider router={router} />
}
