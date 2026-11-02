import { useEffect, useRef } from 'react'

export function useDebouncedSave(save: (value: string) => void, delay = 800) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current)
    }
  }, [])

  function cancel(): void {
    if (timer.current) {
      clearTimeout(timer.current)
      timer.current = null
    }
  }

  function schedule(value: string): void {
    cancel()

    if (value.trim().length === 0) return

    timer.current = setTimeout(() => save(value), delay)
  }

  function flush(value: string): void {
    cancel()

    if (value.trim().length === 0) return

    save(value)
  }

  return { schedule, flush, cancel }
}
