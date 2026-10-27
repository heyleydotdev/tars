import { create } from 'zustand'

import type { Session } from '@tars/auth/server'

// `undefined` means the session has not been restored yet.
export const useAuthStore = create<{ session: Session | null | undefined }>(() => ({
  session: undefined
}))
