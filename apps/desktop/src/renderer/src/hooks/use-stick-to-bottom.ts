import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'

const STICK_THRESHOLD = 4

export function useStickToBottom<T extends HTMLElement>(messages: Array<unknown>) {
  const ref = useRef<T | null>(null)
  const stuckRef = useRef(true)
  const [isStuck, setIsStuck] = useState(true)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const handleScroll = (): void => {
      const distance = element.scrollHeight - element.scrollTop - element.clientHeight
      const stuck = distance <= STICK_THRESHOLD

      stuckRef.current = stuck
      setIsStuck(stuck)
    }

    handleScroll()
    element.addEventListener('scroll', handleScroll, { passive: true })

    return () => element.removeEventListener('scroll', handleScroll)
  }, [])

  useLayoutEffect(() => {
    if (stuckRef.current) {
      const element = ref.current
      if (element) element.scrollTop = element.scrollHeight
    }
  }, [messages])

  const scrollToBottom = useCallback(() => {
    const element = ref.current

    if (element) {
      element.scrollTo({ top: element.scrollHeight, behavior: 'smooth' })
    }

    stuckRef.current = true
    setIsStuck(true)
  }, [])

  return { ref, isStuck, scrollToBottom }
}
