import { Menu, Tray } from 'electron'

import icon from '../../resources/icon.png?asset'
import { APP_NAME } from './constants'

type TrayActions = {
  onShow: () => void
  onToggle: () => void
  onQuit: () => void
}

let tray: Tray | null = null

export function createTray({ onShow, onToggle, onQuit }: TrayActions): void {
  tray = new Tray(icon)
  tray.setToolTip(APP_NAME)
  tray.setContextMenu(
    Menu.buildFromTemplate([
      { label: `Show ${APP_NAME}`, click: onShow },
      { type: 'separator' },
      { label: `Quit ${APP_NAME}`, click: onQuit }
    ])
  )

  if (process.platform !== 'darwin') {
    tray.on('click', onToggle)
  }
}

export function destroyTray(): void {
  tray?.destroy()
  tray = null
}
