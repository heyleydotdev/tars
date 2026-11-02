import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type VoiceStore = {
  windowFocused: boolean
  userPaused: boolean
  wakeEnabled: boolean
  isTranscribing: boolean
  error: string | null
  setWindowFocused: (focused: boolean) => void
  setTranscribing: (transcribing: boolean) => void
  setError: (error: string | null) => void
  setWakeEnabled: (enabled: boolean) => void
  togglePaused: () => void
  pause: () => void
  resume: () => void
}

export const useVoiceStore = create<VoiceStore>()(
  persist(
    (set) => ({
      windowFocused: true,
      userPaused: true,
      wakeEnabled: true,
      isTranscribing: false,
      error: null,
      setWindowFocused: (windowFocused) => set({ windowFocused }),
      setTranscribing: (isTranscribing) => set({ isTranscribing }),
      setError: (error) => set({ error }),
      setWakeEnabled: (wakeEnabled) => set({ wakeEnabled }),
      togglePaused: () => set((state) => ({ userPaused: !state.userPaused })),
      pause: () => set({ userPaused: true }),
      resume: () => set({ userPaused: false })
    }),
    {
      name: 'tars.voice.preferences',
      partialize: (state) => ({ wakeEnabled: state.wakeEnabled }),
      merge: (persisted, current) => {
        const saved = persisted as Partial<VoiceStore> | undefined

        return {
          ...current,
          wakeEnabled:
            typeof saved?.wakeEnabled === 'boolean' ? saved.wakeEnabled : current.wakeEnabled
        }
      }
    }
  )
)

export function isVoicePaused(state: VoiceStore): boolean {
  return state.windowFocused ? state.userPaused : !state.wakeEnabled
}
