import type { IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

import type { Session } from '@tars/auth/server'
import type { RegisterInput } from '@tars/core/schemas/auth'
import { setupRenderer } from '@tars/auth/preload'

setupRenderer()

const windowControls: WindowControlsApi = {
  minimize: (): void => ipcRenderer.send('window:minimize'),
  toggleMaximize: (): void => ipcRenderer.send('window:toggle-maximize'),
  close: (): void => ipcRenderer.send('window:close'),
  isMaximized: (): Promise<boolean> => ipcRenderer.invoke('window:is-maximized'),
  onMaximizedChange: (callback): (() => void) => {
    const listener = (_event: IpcRendererEvent, maximized: boolean): void => {
      callback(maximized)
    }

    ipcRenderer.on('window:maximized-changed', listener)

    return () => {
      ipcRenderer.removeListener('window:maximized-changed', listener)
    }
  }
}

const auth = {
  getSession: (): Promise<Session | null> => ipcRenderer.invoke('auth:get-session'),
  signIn: (email: string, password: string): Promise<AuthResult> =>
    ipcRenderer.invoke('auth:sign-in', { email, password }),
  signUp: (input: RegisterInput): Promise<AuthResult> => ipcRenderer.invoke('auth:sign-up', input),
  confirmSignOut: (): Promise<boolean> => ipcRenderer.invoke('auth:confirm-sign-out')
}

const api = { windowControls }

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
    contextBridge.exposeInMainWorld('getSession', auth.getSession)
    contextBridge.exposeInMainWorld('signIn', auth.signIn)
    contextBridge.exposeInMainWorld('signUp', auth.signUp)
    contextBridge.exposeInMainWorld('confirmSignOut', auth.confirmSignOut)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
  window.getSession = auth.getSession
  window.signIn = auth.signIn
  window.signUp = auth.signUp
  window.confirmSignOut = auth.confirmSignOut
}
