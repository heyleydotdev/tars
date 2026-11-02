import { app, ipcMain } from 'electron'

export function registerApp(): void {
  ipcMain.handle('app:info', () => ({
    version: app.getVersion(),
    electron: process.versions.electron,
    packaged: app.isPackaged
  }))
}
