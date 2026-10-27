import type { ElectronAPI } from '@electron-toolkit/preload'

declare global {
  interface WindowControlsApi {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (callback: (maximized: boolean) => void) => () => void
  }

  interface Window {
    electron: ElectronAPI
    api: {
      auth: {
        getSession: () => Promise<{ id: string; email: string } | null>
        login: (email: string, password: string) => Promise<{ id: string; email: string }>
        logout: () => Promise<void>
      }
      windowControls: WindowControlsApi
    }
  }
}
