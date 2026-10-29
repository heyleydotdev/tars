import { join } from 'node:path'
import { is } from '@electron-toolkit/utils'
import { app, BrowserWindow, screen, shell } from 'electron'

import { WINDOW_BACKGROUND } from '@tars/core/constants'

import icon from '../../resources/icon.png?asset'
import { requestMicrophoneAccess } from './ipc/media'

let quitting = false

export function markQuitting(): void {
  quitting = true
}

export function getMainWindow(): BrowserWindow | null {
  return BrowserWindow.getAllWindows()[0] ?? null
}

export function bringWindowToFront(window: BrowserWindow): void {
  if (window.isMinimized()) {
    window.restore()
  }

  app.focus({ steal: true })
  window.show()

  if (process.platform === 'win32') {
    window.setAlwaysOnTop(true, 'floating')
  }

  window.moveTop()
  window.focus()

  if (process.platform === 'win32') {
    window.setAlwaysOnTop(false)
  }
}

function openExternal(url: string): void {
  try {
    const { protocol } = new URL(url)

    if (protocol === 'http:' || protocol === 'https:' || protocol === 'mailto:') {
      void shell.openExternal(url).catch(() => {})
    }
  } catch {
    // Ignore malformed links.
  }
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
      preload: join(__dirname, '../preload/index.mjs'),
      sandbox: false
    }
  })

  window.webContents.session.setPermissionCheckHandler(
    (_webContents, permission, _origin, details) =>
      permission === 'media' && details.mediaType !== 'video'
  )
  window.webContents.session.setPermissionRequestHandler(
    (_webContents, permission, callback, details) => {
      if (
        permission !== 'media' ||
        !('mediaTypes' in details) ||
        details.mediaTypes?.includes('audio') !== true
      ) {
        callback(false)
        return
      }

      void requestMicrophoneAccess(window).then(callback, () => callback(false))
    }
  )

  const emitFocus = (): void => {
    window.webContents.send('window:focus-changed', window.isVisible() && window.isFocused())
  }

  window.on('ready-to-show', () => {
    window.show()
    emitFocus()
  })
  window.on('focus', emitFocus)
  window.on('blur', emitFocus)
  window.on('show', emitFocus)
  window.on('hide', emitFocus)

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
    openExternal(details.url)

    return { action: 'deny' }
  })

  window.webContents.on('will-navigate', (event, url) => {
    const current = window.webContents.getURL()

    if (url.split('#')[0] === current.split('#')[0]) return

    event.preventDefault()
    openExternal(url)
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

  bringWindowToFront(window)
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
