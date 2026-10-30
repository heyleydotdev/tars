import { create } from 'zustand'

type DeskChatStore = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useDeskChatStore = create<DeskChatStore>()((set) => ({
  open: false,
  setOpen: (open) => set({ open })
}))
