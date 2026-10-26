import { join } from 'path'
import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { electronApp, is, optimizer } from '@electron-toolkit/utils'
import { app, BrowserWindow, ipcMain, screen, shell } from 'electron'

import icon from '../../resources/icon.png?asset'

function windowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

function registerWindowControls(): void {
  ipcMain.on('window:minimize', (event) => {
    windowFromEvent(event)?.minimize()
  })

  ipcMain.on('window:toggle-maximize', (event) => {
    const window = windowFromEvent(event)
    if (!window) return

    if (window.isMaximized()) {
      window.unmaximize()
    } else {
      window.maximize()
    }
  })

  ipcMain.on('window:close', (event) => {
    windowFromEvent(event)?.close()
  })

  ipcMain.handle('window:is-maximized', (event) => windowFromEvent(event)?.isMaximized() ?? false)
}

function createWindow(): void {
  // 80% of the work area, capped so large monitors don't open a full-desktop window.
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  const mainWindow = new BrowserWindow({
    width: Math.min(1280, Math.round(screenWidth * 0.8)),
    height: Math.min(800, Math.round(screenHeight * 0.8)),
    minWidth: 640,
    minHeight: 480,
    center: true,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: '#09090b',
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  const sendMaximizedState = (): void => {
    mainWindow.webContents.send('window:maximized-changed', mainWindow.isMaximized())
  }

  mainWindow.on('maximize', sendMaximizedState)
  mainWindow.on('unmaximize', sendMaximizedState)

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.tars.desktop')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  registerWindowControls()
  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})
