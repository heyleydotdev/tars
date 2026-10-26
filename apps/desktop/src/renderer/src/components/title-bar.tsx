import type { ReactNode } from 'react'
import { useEffect, useState } from 'react'

import { cn } from '@tars/ui/lib/utils'

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
  const [maximized, setMaximized] = useState(false)
  const controls = window.api.windowControls

  useEffect(() => {
    void controls.isMaximized().then(setMaximized)

    return controls.onMaximizedChange(setMaximized)
  }, [controls])

  return (
    <header className="bg-background flex h-9 shrink-0 items-center border-b select-none [-webkit-app-region:drag]">
      <span className="font-heading text-muted-foreground pl-3 text-[11px] font-semibold tracking-[0.18em]">
        TARS
      </span>
      <div className="ml-auto flex h-full [-webkit-app-region:no-drag]">
        <WindowControlButton label="Minimize" onClick={controls.minimize}>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5.5h10" stroke="currentColor" />
          </svg>
        </WindowControlButton>
        <WindowControlButton
          label={maximized ? 'Restore' : 'Maximize'}
          onClick={controls.toggleMaximize}
        >
          <MaximizeIcon maximized={maximized} />
        </WindowControlButton>
        <WindowControlButton label="Close" onClick={controls.close} destructive>
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" />
          </svg>
        </WindowControlButton>
      </div>
    </header>
  )
}
