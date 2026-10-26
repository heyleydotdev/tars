import { useEffect, useState } from 'react'

function MaximizeIcon({ maximized }: { maximized: boolean }): React.JSX.Element {
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

function TitleBar(): React.JSX.Element {
  const [maximized, setMaximized] = useState(false)
  const controls = window.api.windowControls

  useEffect(() => {
    void controls.isMaximized().then(setMaximized)

    return controls.onMaximizedChange(setMaximized)
  }, [controls])

  return (
    <header className="titlebar">
      <span className="titlebar-title">TARS</span>
      <div className="titlebar-controls">
        <button
          type="button"
          className="titlebar-button"
          aria-label="Minimize"
          onClick={controls.minimize}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0 5.5h10" stroke="currentColor" />
          </svg>
        </button>
        <button
          type="button"
          className="titlebar-button"
          aria-label={maximized ? 'Restore' : 'Maximize'}
          onClick={controls.toggleMaximize}
        >
          <MaximizeIcon maximized={maximized} />
        </button>
        <button
          type="button"
          className="titlebar-button titlebar-button--close"
          aria-label="Close"
          onClick={controls.close}
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M0.5 0.5l9 9M9.5 0.5l-9 9" stroke="currentColor" />
          </svg>
        </button>
      </div>
    </header>
  )
}

export default TitleBar
