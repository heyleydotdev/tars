import { create } from 'zustand'

type VoiceStore = {
  windowFocused: boolean
  userPaused: boolean
  isTranscribing: boolean
  error: string | null
  setWindowFocused: (focused: boolean) => void
  setTranscribing: (transcribing: boolean) => void
  setError: (error: string | null) => void
  togglePaused: () => void
  pause: () => void
  resume: () => void
}

export const useVoiceStore = create<VoiceStore>((set) => ({
  windowFocused: true,
  userPaused: true,
  isTranscribing: false,
  error: null,
  setWindowFocused: (windowFocused) => set({ windowFocused }),
  setTranscribing: (isTranscribing) => set({ isTranscribing }),
  setError: (error) => set({ error }),
  togglePaused: () => set((state) => ({ userPaused: !state.userPaused })),
  pause: () => set({ userPaused: true }),
  resume: () => set({ userPaused: false })
}))

export function isVoicePaused(state: VoiceStore): boolean {
  return state.windowFocused && state.userPaused
}
