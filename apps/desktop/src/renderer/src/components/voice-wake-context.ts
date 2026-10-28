import { createContext, useContext } from 'react'

export type VoiceWakeContextValue = {
  isPaused: boolean
  lastPhrase: string | null
  error: string | null
  togglePaused: () => void
}

export const voiceWakeContext = createContext<VoiceWakeContextValue | null>(null)

export function useVoiceWake(): VoiceWakeContextValue {
  const context = useContext(voiceWakeContext)

  if (!context) {
    throw new Error('useVoiceWake must be used within VoiceWakeListener')
  }

  return context
}
