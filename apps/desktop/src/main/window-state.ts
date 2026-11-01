import type { BrowserWindow, Rectangle } from 'electron'
import { screen } from 'electron'
import Store from 'electron-store'

export const MIN_WINDOW_WIDTH = 640
export const MIN_WINDOW_HEIGHT = 480

const SAVE_DELAY_MS = 250

type WindowState = {
  bounds: Rectangle | null
  maximized: boolean
}

const store = new Store<WindowState>({
  name: 'window-state',
  clearInvalidConfig: true,
  defaults: { bounds: null, maximized: false }
})

function isOnScreen(bounds: Rectangle): boolean {
  return screen.getAllDisplays().some(({ workArea }) => {
    const overlapsX = bounds.x < workArea.x + workArea.width && bounds.x + bounds.width > workArea.x
    const overlapsY =
      bounds.y < workArea.y + workArea.height && bounds.y + bounds.height > workArea.y

    return overlapsX && overlapsY
  })
}

export function loadWindowState(): { bounds: Rectangle; maximized: boolean } | null {
  const state = store.store

  if (!state.bounds) return null
  if (state.bounds.width < MIN_WINDOW_WIDTH || state.bounds.height < MIN_WINDOW_HEIGHT) return null
  if (!isOnScreen(state.bounds)) return null

  return { bounds: state.bounds, maximized: state.maximized }
}

export function trackWindowState(window: BrowserWindow): void {
  let timer: ReturnType<typeof setTimeout> | null = null

  function save(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    store.set({ bounds: window.getNormalBounds(), maximized: window.isMaximized() })
  }

  function schedule(): void {
    if (timer) clearTimeout(timer)
    timer = setTimeout(save, SAVE_DELAY_MS)
  }

  window.on('resize', schedule)
  window.on('move', schedule)
  window.on('maximize', save)
  window.on('unmaximize', save)
  window.on('close', save)
}
