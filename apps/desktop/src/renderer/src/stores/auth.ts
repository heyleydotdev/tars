import { useOutletContext } from 'react-router'
import { create } from 'zustand'

import type { Session } from '@tars/auth/server'

type AuthStore = {
  session: Session | null | undefined
  setSession: (session: Session | null | undefined) => void
}

// `undefined` means the session has not been restored yet.
export const useAuthStore = create<AuthStore>()((set) => ({
  session: undefined,
  setSession: (session) => set({ session })
}))

// Only for routes under RequireAuth, which provides the session and redirects
// to /login when there is none.
export function useUser(): Session['user'] {
  return useOutletContext<Session>().user
}
