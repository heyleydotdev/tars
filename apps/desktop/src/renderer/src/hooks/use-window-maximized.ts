import { useEffect, useState } from 'react'

export function useWindowMaximized(): boolean {
  const [maximized, setMaximized] = useState(false)

  useEffect(() => {
    const controls = window.api.windowControls

    void controls.isMaximized().then(setMaximized)

    return controls.onMaximizedChange(setMaximized)
  }, [])

  return maximized
}
