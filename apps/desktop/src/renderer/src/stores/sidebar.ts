import { create } from 'zustand'
import { persist } from 'zustand/middleware'

type SidebarStore = {
  open: boolean
  setOpen: (open: boolean) => void
}

export const useSidebarStore = create<SidebarStore>()(
  persist(
    (set) => ({
      open: true,
      setOpen: (open) => set({ open })
    }),
    {
      name: 'tars.sidebar',
      partialize: (state) => ({ open: state.open }),
      merge: (persisted, current) => {
        const open = (persisted as { open?: unknown } | undefined)?.open

        return { ...current, open: typeof open === 'boolean' ? open : current.open }
      }
    }
  )
)
