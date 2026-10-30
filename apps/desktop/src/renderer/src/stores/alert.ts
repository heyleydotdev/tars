import { create } from 'zustand'

export type ShellAlertVariant = 'default' | 'destructive'

export type ShellAlertMessage = {
  id: string
  title: string
  description?: string
  variant?: ShellAlertVariant
}

type ShowShellAlertInput = Omit<ShellAlertMessage, 'id'>

type ShellAlertStore = {
  alert: ShellAlertMessage | null
  showAlert: (input: ShowShellAlertInput) => void
  dismissAlert: () => void
}

export const useShellAlertStore = create<ShellAlertStore>()((set) => ({
  alert: null,
  showAlert: (input) => set({ alert: { id: crypto.randomUUID(), ...input } }),
  dismissAlert: () => set({ alert: null })
}))
