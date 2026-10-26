import { useEffect, useState } from 'react'

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

export default function TitleBar() {
  const [maximized, setMaximized] = useState(false)
  const controls = window.api.windowControls

  useEffect(() => {
    void controls.isMaximized().then(setMaximized)

    return controls.onMaximizedChange(setMaximized)
  }, [controls])

  return (
    <header className="bg-background fixed inset-x-0 top-0 z-10 flex h-9 items-center select-none [-webkit-app-region:drag]">
      <span className="font-heading text-muted-foreground pl-3 text-[11px] font-semibold tracking-[0.18em]">
        TARS
      </span>
      <div className="ml-auto flex h-full [-webkit-app-region:no-drag]">
        <button
          type="button"
          aria-label="Minimize"
          onClick={controls.minimize}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring grid h-full w-11 place-items-center focus-visible:outline-1 focus-visible:-outline-offset-1"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5.5h10" stroke="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          aria-label={maximized ? 'Restore' : 'Maximize'}
          onClick={controls.toggleMaximize}
          className="text-muted-foreground hover:bg-accent hover:text-accent-foreground focus-visible:outline-ring grid h-full w-11 place-items-center focus-visible:outline-1 focus-visible:-outline-offset-1"
        >
          <MaximizeIcon maximized={maximized} />
        </button>
        <button
          type="button"
          aria-label="Close"
          onClick={controls.close}
          className="text-muted-foreground focus-visible:outline-ring grid h-full w-11 place-items-center hover:bg-red-600 hover:text-white focus-visible:outline-1 focus-visible:-outline-offset-1"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  )
}
