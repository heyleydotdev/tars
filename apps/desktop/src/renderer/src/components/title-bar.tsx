import type { ReactNode } from 'react'
import { PanelLeftIcon } from 'lucide-react'

import { cn } from '@tars/ui/lib/utils'

import { useWindowMaximized } from '../hooks/use-window-maximized'
import { useAuthStore } from '../stores/auth'
import { useSidebarStore } from '../stores/sidebar'

function MaximizeIcon({ maximized }: { maximized: boolean }) {
  if (maximized) {
    return (
      <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
        <path d="M2.5 2.5V0.5h7v7h-2" fill="none" stroke="currentColor" />
        <rect x="0.5" y="2.5" width="7" height="7" fill="none" stroke="currentColor" />
      </svg>
    )
  }

  return (
    <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
      <rect x="0.5" y="0.5" width="9" height="9" fill="none" stroke="currentColor" />
    </svg>
  )
}

function WindowControlButton(props: {
  label: string
  onClick: () => void
  destructive?: boolean
  children: ReactNode
}) {
  const { label, onClick, destructive, children } = props

  return (
    <button
      type="button"
      aria-label={label}
      onClick={onClick}
      className={cn(
        'text-muted-foreground focus-visible:outline-ring grid h-full w-11 place-items-center focus-visible:outline-1 focus-visible:-outline-offset-1',
        destructive
          ? 'hover:bg-red-600 hover:text-white'
          : 'hover:bg-accent hover:text-accent-foreground'
      )}
    >
      {children}
    </button>
  )
}

export default function TitleBar() {
  const maximized = useWindowMaximized()
  const controls = window.api.windowControls
  const session = useAuthStore((state) => state.session)
  const open = useSidebarStore((state) => state.open)
  const setOpen = useSidebarStore((state) => state.setOpen)

  return (
    <header className="bg-sidebar border-sidebar-border relative z-60 flex h-(--title-bar-height) shrink-0 items-center border-b select-none [-webkit-app-region:drag]">
      {session ? (
        <div className="flex items-center gap-2 pl-2">
          <div className="bg-sidebar-primary text-sidebar-primary-foreground flex size-6 items-center justify-center text-xs font-semibold">
            TA
          </div>
          <span className="text-sm font-medium">TARS</span>
          <button
            type="button"
            aria-label="Toggle Sidebar"
            onClick={() => setOpen(!open)}
            className="text-muted-foreground hover:bg-accent hover:text-accent-foreground ml-1 hidden size-7 place-items-center [-webkit-app-region:no-drag] md:grid"
          >
            <PanelLeftIcon className="size-4" />
          </button>
        </div>
      ) : null}
      <div className="ml-auto flex h-full [-webkit-app-region:no-drag]">
        <WindowControlButton label="Minimize" onClick={() => controls.minimize()}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5.5h10" stroke="currentColor" />
          </svg>
        </WindowControlButton>
        <WindowControlButton
          label={maximized ? 'Restore' : 'Maximize'}
          onClick={() => controls.toggleMaximize()}
        >
          <MaximizeIcon maximized={maximized} />
        </WindowControlButton>
        <WindowControlButton label="Close" onClick={() => controls.close()} destructive>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" />
          </svg>
        </WindowControlButton>
      </div>
    </header>
  )
}
