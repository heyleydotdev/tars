import type { ElectronAPI } from '@electron-toolkit/preload'

import type { Session } from '@tars/auth/server'
import type { RegisterInput } from '@tars/core/schemas/auth'

import type { authClient } from '../lib/auth-client'

declare global {
  type Bridges = typeof authClient.$Infer.Bridges

  interface AuthResult {
    session: Session | null
    error: string | null
  }

  interface WindowControlsApi {
    minimize: () => void
    toggleMaximize: () => void
    close: () => void
    isMaximized: () => Promise<boolean>
    onMaximizedChange: (callback: (maximized: boolean) => void) => () => void
  }

  interface Window extends Bridges {
    electron: ElectronAPI
    api: {
      windowControls: WindowControlsApi
    }
    getSession: () => Promise<Session | null>
    signIn: (email: string, password: string) => Promise<AuthResult>
    signUp: (input: RegisterInput) => Promise<AuthResult>
    confirmSignOut: () => Promise<boolean>
    requestMicrophoneAccess: () => Promise<boolean>
    transcribeAudio: (audio: ArrayBuffer) => Promise<string | null>
  }
}
