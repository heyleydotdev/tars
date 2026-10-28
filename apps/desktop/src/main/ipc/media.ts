import { BrowserWindow, dialog, ipcMain, shell, systemPreferences } from 'electron'

import { ERRORS } from '@tars/core/errors'

function settingsUrl(): string {
  return process.platform === 'darwin'
    ? 'x-apple.systempreferences:com.apple.preference.security?Privacy_Microphone'
    : 'ms-settings:privacy-microphone'
}

function hasMicrophoneAccess(): boolean {
  return systemPreferences.getMediaAccessStatus('microphone') === 'granted'
}

// macOS can prompt at runtime; Windows only has a global privacy toggle, so the
// best we can do there is send people to it.
export async function requestMicrophoneAccess(window: BrowserWindow | null): Promise<boolean> {
  if (hasMicrophoneAccess()) {
    return true
  }

  if (process.platform === 'darwin' && (await systemPreferences.askForMediaAccess('microphone'))) {
    return true
  }

  const options = {
    type: 'info' as const,
    title: ERRORS.microphoneAccessTitle,
    message: ERRORS.microphoneAccessMessage,
    detail: ERRORS.microphoneAccessDetail,
    buttons: ['Open settings', 'Not now'],
    defaultId: 0,
    cancelId: 1,
    noLink: true
  }

  const { response } = window
    ? await dialog.showMessageBox(window, options)
    : await dialog.showMessageBox(options)

  if (response === 0) {
    await shell.openExternal(settingsUrl())
  }

  return false
}

export function registerMedia(): void {
  ipcMain.handle('media:request-microphone', (event) =>
    requestMicrophoneAccess(BrowserWindow.fromWebContents(event.sender))
  )
}
