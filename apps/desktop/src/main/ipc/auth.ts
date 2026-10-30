import { ipcMain } from 'electron'

import type { Session } from '@tars/auth/server'
import type { LoginInput, RegisterInput } from '@tars/core/schemas/auth'
import { ERRORS } from '@tars/core/errors'

import { authClient } from '../../lib/auth-client'

type AuthResult = { session: Session | null; error: string | null }

async function currentSession(): Promise<Session | null> {
  const { data } = await authClient.getSession()
  return data
}

export function registerAuth(): void {
  ipcMain.handle('auth:get-session', currentSession)

  ipcMain.handle('auth:sign-in', async (_event, input: LoginInput): Promise<AuthResult> => {
    const { error } = await authClient.signIn.email(input)

    return error
      ? { session: null, error: error.message ?? ERRORS.tryAgain }
      : { session: await currentSession(), error: null }
  })

  ipcMain.handle('auth:sign-up', async (_event, input: RegisterInput): Promise<AuthResult> => {
    const { error } = await authClient.signUp.email(input)

    return error
      ? { session: null, error: error.message ?? ERRORS.tryAgain }
      : { session: await currentSession(), error: null }
  })
}
