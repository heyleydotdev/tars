import type { RegisterInput } from '@tars/core/schemas/auth'

import { useShellAlertStore } from '../stores/alert'
import { useAuthStore } from '../stores/auth'

export async function restoreSession(): Promise<void> {
  try {
    useAuthStore.getState().setSession(await window.getSession())
  } catch {
    useAuthStore.getState().setSession(null)
  }
}

export async function signIn(email: string, password: string): Promise<void> {
  const { session, error } = await window.signIn(email, password)

  if (error) {
    throw new Error(error)
  }

  useAuthStore.getState().setSession(session)
}

export async function signUp(input: RegisterInput): Promise<void> {
  const { session, error } = await window.signUp(input)

  if (error) {
    throw new Error(error)
  }

  useAuthStore.getState().setSession(session)
}

export async function signOut(): Promise<void> {
  try {
    await window.signOut()
    useAuthStore.getState().setSession(null)
  } catch {
    useShellAlertStore.getState().showAlert({
      title: 'Sign out failed',
      description: 'Try again.',
      variant: 'destructive'
    })
  }
}

// Main-process auth changes (deep links, other windows) arrive as events; keep
// the renderer store canonical by refetching the session instead of merging.
export function watchSession(): () => void {
  const refresh = (): void => {
    window
      .getSession()
      .then((session) => useAuthStore.getState().setSession(session))
      .catch(() => useAuthStore.getState().setSession(null))
  }

  const stopUserUpdates = window.onUserUpdated(refresh)
  const stopAuthenticated = window.onAuthenticated(refresh)

  return () => {
    stopUserUpdates()
    stopAuthenticated()
  }
}
