import { useOutletContext } from 'react-router'
import { create } from 'zustand'

import type { Session } from '@tars/auth/server'

// `undefined` means the session has not been restored yet.
export const useAuthStore = create<{ session: Session | null | undefined }>(() => ({
  session: undefined
}))

// Only for routes under RequireAuth, which provides the session and redirects
// to /login when there is none.
export function useUser(): Session['user'] {
  return useOutletContext<Session>().user
}
