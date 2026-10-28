import { create } from 'zustand'

type ComposerStore = {
  value: string
  setValue: (value: string) => void
  append: (text: string) => void
  clear: () => void
}

export const useComposerStore = create<ComposerStore>((set) => ({
  value: '',
  setValue: (value) => set({ value }),
  append: (text) => set((state) => ({ value: state.value ? `${state.value} ${text}` : text })),
  clear: () => set({ value: '' })
}))
