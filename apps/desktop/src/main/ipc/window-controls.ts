import type { IpcMainEvent, IpcMainInvokeEvent } from 'electron'
import { BrowserWindow, ipcMain } from 'electron'

function windowFromEvent(event: IpcMainEvent | IpcMainInvokeEvent): BrowserWindow | null {
  return BrowserWindow.fromWebContents(event.sender)
}

export function registerWindowControls(): void {
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
