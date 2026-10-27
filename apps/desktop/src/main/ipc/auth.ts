import { BrowserWindow, dialog, ipcMain } from 'electron'

import type { Session } from '@tars/auth/server'
import type { LoginInput, RegisterInput } from '@tars/core/schemas/auth'

import { authClient } from '../../lib/auth-client'

type AuthResult = { session: Session | null; error: string | null }

async function currentSession(): Promise<Session | null> {
  const { data } = await authClient.getSession()
  return data
}

export function registerAuth(): void {
  ipcMain.handle('auth:get-session', currentSession)

  ipcMain.handle('auth:confirm-sign-out', async (event) => {
    const window = BrowserWindow.fromWebContents(event.sender)

    if (!window) {
      return false
    }

    const { response } = await dialog.showMessageBox(window, {
      type: 'question',
      buttons: ['Cancel', 'Log out'],
      defaultId: 0,
      cancelId: 0,
      noLink: true,
      title: 'Log out',
      message: 'Log out of TARS?',
      detail: 'You can sign back in at any time.'
    })

    return response === 1
  })

  ipcMain.handle('auth:sign-in', async (_event, input: LoginInput): Promise<AuthResult> => {
    const { error } = await authClient.signIn.email(input)

    return error
      ? { session: null, error: error.message ?? 'Something went wrong.' }
      : { session: await currentSession(), error: null }
  })

  ipcMain.handle('auth:sign-up', async (_event, input: RegisterInput): Promise<AuthResult> => {
    const { error } = await authClient.signUp.email(input)

    return error
      ? { session: null, error: error.message ?? 'Something went wrong.' }
      : { session: await currentSession(), error: null }
  })
}
