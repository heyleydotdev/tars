import { useEffect } from 'react'
import { RouterProvider } from 'react-router'

import { router } from './routes'
import { useAuthStore } from './stores/auth'

export default function App() {
  const restore = useAuthStore((state) => state.restore)

  useEffect(() => {
    void restore()
  }, [restore])

  return <RouterProvider router={router} />
}
