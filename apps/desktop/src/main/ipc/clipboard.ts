import { clipboard, ipcMain } from 'electron'

export function registerClipboard(): void {
  ipcMain.handle('clipboard:write-text', (_event, text: unknown) => {
    if (typeof text !== 'string') return

    clipboard.writeText(text)
  })
}
