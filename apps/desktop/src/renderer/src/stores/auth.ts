import { create } from 'zustand'

export const useAuthStore = create<{
  user: { id: string; email: string } | null
  loading: boolean
  restore: () => Promise<void>
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}>()((set) => ({
  user: null,
  loading: true,
  restore: async () => {
    try {
      set({ user: await window.api.auth.getSession(), loading: false })
    } catch {
      set({ user: null, loading: false })
    }
  },
  login: async (email, password) => {
    set({ user: await window.api.auth.login(email, password) })
  },
  logout: async () => {
    await window.api.auth.logout()
    set({ user: null })
  }
}))
