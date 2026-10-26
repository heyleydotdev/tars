import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { BrowserWindow, screen, shell } from 'electron'

import icon from '../../resources/icon.png?asset'
import { WINDOW_BACKGROUND } from './constants'

let quitting = false

export function markQuitting(): void {
  quitting = true
}

export function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

export function createWindow(): BrowserWindow {
  // 80% of the work area, capped so large monitors don't open a full-desktop window.
  const { width: screenWidth, height: screenHeight } = screen.getPrimaryDisplay().workAreaSize

  const window = new BrowserWindow({
    width: Math.min(1280, Math.round(screenWidth * 0.8)),
    height: Math.min(800, Math.round(screenHeight * 0.8)),
    minWidth: 640,
    minHeight: 480,
    center: true,
    show: false,
    autoHideMenuBar: true,
    frame: false,
    backgroundColor: WINDOW_BACKGROUND,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  window.on('ready-to-show', () => {
    window.show()
  })

  window.on('close', (event) => {
    if (quitting) return

    event.preventDefault()
    window.hide()
  })

  const sendMaximizedState = (): void => {
    window.webContents.send('window:maximized-changed', window.isMaximized())
  }

  window.on('maximize', sendMaximizedState)
  window.on('unmaximize', sendMaximizedState)

  window.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    window.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}

export function showWindow(): void {
  const window = getMainWindow()

  if (!window) {
    createWindow()
    return
  }

  if (window.isMinimized()) {
    window.restore()
  }

  window.show()
  window.focus()
}

export function toggleWindow(): void {
  const window = getMainWindow()

  if (!window) {
    createWindow()
    return
  }

  if (window.isVisible() && !window.isMinimized()) {
    window.hide()
  } else {
    showWindow()
  }
}
