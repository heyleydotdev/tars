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

let store: Store<WindowState> | null = null

// Resolve userData lazily: the app name is set after module evaluation, so
// constructing the store at import time can land in the wrong directory.
function getStore(): Store<WindowState> {
  store ??= new Store<WindowState>({
    name: 'window-state',
    clearInvalidConfig: true,
    defaults: { bounds: null, maximized: false }
  })

  return store
}

export function fitToDisplay(bounds: Rectangle): Rectangle | null {
  const { workArea } = screen.getDisplayMatching(bounds)
  const width = Math.min(bounds.width, workArea.width)
  const height = Math.min(bounds.height, workArea.height)

  if (width < MIN_WINDOW_WIDTH || height < MIN_WINDOW_HEIGHT) return null

  return {
    x: Math.min(Math.max(bounds.x, workArea.x), workArea.x + workArea.width - width),
    y: Math.min(Math.max(bounds.y, workArea.y), workArea.y + workArea.height - height),
    width,
    height
  }
}

export function loadWindowState(): { bounds: Rectangle; maximized: boolean } | null {
  const state = getStore().store

  if (!state.bounds) return null

  const bounds = fitToDisplay(state.bounds)

  return bounds ? { bounds, maximized: state.maximized } : null
}

export function trackWindowState(window: BrowserWindow): void {
  let timer: ReturnType<typeof setTimeout> | null = null

  function save(): void {
    if (timer) {
      clearTimeout(timer)
      timer = null
    }

    getStore().set({ bounds: window.getNormalBounds(), maximized: window.isMaximized() })
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
