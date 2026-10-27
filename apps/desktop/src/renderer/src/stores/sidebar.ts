import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export const useSidebarStore = create<{
  open: boolean
  setOpen: (open: boolean) => void
}>()(
  persist(
    (set) => ({
      open: true,
      setOpen: (open) => set({ open })
    }),
    { name: 'tars.sidebar' }
  )
)
