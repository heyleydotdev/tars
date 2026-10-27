import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'
import { useShallow } from 'zustand/react/shallow'

import { Spinner } from '@tars/ui/components/spinner'

import { safeRedirect } from '../lib/redirect'
import { useAuthStore } from '../stores/auth'

function LoadingScreen() {
  return (
    <div className="bg-background flex h-svh items-center justify-center">
      <Spinner />
    </div>
  )
}

export function RequireAuth() {
  const { user, loading } = useAuthStore(
    useShallow((state) => ({ user: state.user, loading: state.loading }))
  )
  const location = useLocation()

  if (loading) return <LoadingScreen />
  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />
  }

  return <Outlet />
}

export function GuestOnly() {
  const { user, loading } = useAuthStore(
    useShallow((state) => ({ user: state.user, loading: state.loading }))
  )
  const [searchParams] = useSearchParams()

  if (loading) return <LoadingScreen />
  if (user) return <Navigate to={safeRedirect(searchParams.get('redirectTo'))} replace />

  return <Outlet />
}
