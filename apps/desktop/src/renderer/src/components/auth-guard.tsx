import { Navigate, Outlet, useLocation, useSearchParams } from 'react-router'

import { safeRedirect } from '@tars/core/utils/redirect'

import { useAuthStore } from '../stores/auth'
import LoadingScreen from './loading-screen'

export function RequireAuth() {
  const session = useAuthStore((state) => state.session)
  const location = useLocation()

  if (session === undefined) return <LoadingScreen />
  if (!session) {
    const redirectTo = `${location.pathname}${location.search}`
    return <Navigate to={`/login?redirectTo=${encodeURIComponent(redirectTo)}`} replace />
  }

  return <Outlet context={session} />
}

export function GuestOnly() {
  const session = useAuthStore((state) => state.session)
  const [searchParams] = useSearchParams()

  if (session === undefined) return <LoadingScreen />
  if (session) return <Navigate to={safeRedirect(searchParams.get('redirectTo'))} replace />

  return <Outlet />
}
