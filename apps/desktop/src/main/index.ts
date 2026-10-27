import { electronApp, optimizer } from '@electron-toolkit/utils'
import { app, nativeTheme } from 'electron'

import { authClient } from '../lib/auth-client'
import { APP_ID, APP_NAME } from '../lib/constants'
import { registerAuth } from './ipc/auth'
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
  createTray({ onShow: showWindow, onToggle: toggleWindow, onQuit: () => app.quit() })
  createWindow()

  app.on('activate', showWindow)
})

app.on('before-quit', markQuitting)
app.on('will-quit', destroyTray)

app.on('window-all-closed', () => {
  // Stay alive in the tray.
})
