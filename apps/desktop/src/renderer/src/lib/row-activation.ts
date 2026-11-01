export function activateRow(onActivate: () => void): { onClick: () => void } {
  return {
    onClick: () => {
      if (window.getSelection()?.toString()) return

      onActivate()
    }
  }
}
