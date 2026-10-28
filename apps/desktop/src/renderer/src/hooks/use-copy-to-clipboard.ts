import { useCallback, useEffect, useRef, useState } from 'react'

const COPIED_TIMEOUT_MS = 2_000

export function useCopyToClipboard() {
  const [copied, setCopied] = useState(false)
  const copiedTimeoutRef = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (copiedTimeoutRef.current !== null) {
        window.clearTimeout(copiedTimeoutRef.current)
      }
    },
    []
  )

  const copy = useCallback(async (text: string): Promise<void> => {
    try {
      await window.copyText(text)
    } catch {
      return
    }

    setCopied(true)

    if (copiedTimeoutRef.current !== null) {
      window.clearTimeout(copiedTimeoutRef.current)
    }

    copiedTimeoutRef.current = window.setTimeout(() => {
      setCopied(false)
      copiedTimeoutRef.current = null
    }, COPIED_TIMEOUT_MS)
  }, [])

  return { copied, copy }
}
