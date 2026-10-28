import { useCallback, useEffect, useMemo, useState } from 'react'
import { Outlet, useNavigate } from 'react-router'

import type { Session } from '@tars/auth/server'

import { useWakeWord } from '../lib/voice'
import { voiceWakeContext } from './voice-wake-context'

export function VoiceWakeListener({ session }: { session: Session }) {
  const navigate = useNavigate()
  const [windowFocused, setWindowFocused] = useState(true)
  const [userPaused, setUserPaused] = useState(true)

  const onWake = useCallback(() => {
    void (async () => {
      await window.api.windowControls.show()
      await navigate('/')
      // A wake-up call always resumes listening; the user re-pauses explicitly.
      setUserPaused(false)
    })()
  }, [navigate])

  const wake = useWakeWord(onWake)
  const { start, stop } = wake

  useEffect(() => {
    let disposed = false

    void window.api.windowControls.isFocused().then((focused) => {
      if (!disposed) {
        setWindowFocused(focused)
      }
    })

    const unsubscribe = window.api.windowControls.onFocusChange(setWindowFocused)

    return () => {
      disposed = true
      unsubscribe()
    }
  }, [])

  // Listening is always on while hidden/unfocused; the user only controls it
  // while the window is focused.
  const isPaused = windowFocused && userPaused

  useEffect(() => {
    if (isPaused) {
      stop()
    } else {
      void start()
    }
  }, [isPaused, start, stop])

  const togglePaused = useCallback(() => {
    setUserPaused((paused) => !paused)
  }, [])

  const value = useMemo(
    () => ({
      isPaused,
      isTranscribing: wake.isTranscribing,
      lastPhrase: wake.lastPhrase,
      error: wake.error,
      togglePaused
    }),
    [isPaused, wake.isTranscribing, wake.lastPhrase, wake.error, togglePaused]
  )

  return (
    <voiceWakeContext.Provider value={value}>
      <Outlet context={session} />
    </voiceWakeContext.Provider>
  )
}
