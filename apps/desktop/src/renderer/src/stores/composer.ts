import { create } from 'zustand'

import { CHAT_MESSAGE_MAX_LENGTH } from '@tars/core/constants'

type ComposerStore = {
  value: string
  setValue: (value: string) => void
  append: (text: string) => void
  clear: () => void
}

export const useComposerStore = create<ComposerStore>()((set) => ({
  value: '',
  setValue: (value) => set({ value }),
  append: (text) =>
    set((state) => ({
      value: (state.value ? `${state.value} ${text}` : text).slice(0, CHAT_MESSAGE_MAX_LENGTH)
    })),
  clear: () => set({ value: '' })
}))
