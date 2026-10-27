import type { RegisterInput } from '@tars/core/schemas/auth'

import { useAuthStore } from '../stores/auth'

export async function restoreSession(): Promise<void> {
  try {
    useAuthStore.setState({ session: await window.getSession() })
  } catch {
    useAuthStore.setState({ session: null })
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { session, error } = await window.signIn(email, password)

  if (error) {
    throw new Error(error)
  }

  useAuthStore.setState({ session })
}

export async function signUp(input: RegisterInput): Promise<void> {
  const { session, error } = await window.signUp(input)

  if (error) {
    throw new Error(error)
  }

  useAuthStore.setState({ session })
}

export async function signOut(): Promise<void> {
  await window.signOut()
  useAuthStore.setState({ session: null })
}

// Main-process auth changes (deep links, other windows) arrive as events; keep
// the renderer store canonical by refetching the session instead of merging.
export function watchSession(): () => void {
  const refresh = (): void => {
    window
      .getSession()
      .then((session) => useAuthStore.setState({ session }))
      .catch(() => useAuthStore.setState({ session: null }))
  }

  const stopUserUpdates = window.onUserUpdated(refresh)
  const stopAuthenticated = window.onAuthenticated(refresh)

  return () => {
    stopUserUpdates()
    stopAuthenticated()
  }
}
