import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, nativeTheme } from 'electron'

import { APP_ID, APP_NAME } from '@tars/core/constants'

import { authClient } from '../lib/auth-client'
import { registerAuth } from './ipc/auth'
import { registerMedia } from './ipc/media'
import { registerVoice } from './ipc/voice'
import { registerWindowControls } from './ipc/window-controls'
import { createTray, destroyTray } from './tray'
import { createWindow, markQuitting, showWindow, toggleWindow } from './window'

app.setName(APP_NAME)

authClient.setupMain()

app.whenReady().then(() => {
  nativeTheme.themeSource = 'dark'
  electronApp.setAppUserModelId(APP_ID)

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerWindowControls()
  registerAuth()
  registerMedia()
  registerVoice()
  createTray({ onShow: showWindow, onToggle: toggleWindow, onQuit: () => app.quit() })
  createWindow()

  app.on('activate', showWindow)
})

app.on('before-quit', markQuitting)
app.on('will-quit', destroyTray)

app.on('window-all-closed', () => {
  // Stay alive in the tray.
})
