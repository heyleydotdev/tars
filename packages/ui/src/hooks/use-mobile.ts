import { useSyncExternalStore } from 'react'

const MOBILE_BREAKPOINT = 768
const MOBILE_QUERY = `(max-width: ${MOBILE_BREAKPOINT - 1}px)`

function subscribe(callback: () => void): () => void {
  const media = window.matchMedia(MOBILE_QUERY)
  media.addEventListener('change', callback)

  return () => media.removeEventListener('change', callback)
}

function getSnapshot(): boolean {
  return window.innerWidth < MOBILE_BREAKPOINT
}

export function useIsMobile(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot)
}
