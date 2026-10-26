import type { IpcRendererEvent } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'
import { contextBridge, ipcRenderer } from 'electron'

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

const api = { windowControls }

if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  window.electron = electronAPI
  window.api = api
}
