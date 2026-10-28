import { useCallback, useEffect, useRef } from 'react'
import { Outlet, useNavigate } from 'react-router'

import type { Session } from '@tars/auth/server'
import { VOICE_WAKE_DEDUPLICATION_MS, VOICE_WAKE_PATTERN } from '@tars/core/constants'
import { normalizeText } from '@tars/core/utils/string'

import { useWakeWord } from '../lib/voice'
import { useComposerStore } from '../stores/composer'
import { isVoicePaused, useVoiceStore } from '../stores/voice'

export function VoiceWakeListener({ session }: { session: Session }) {
  const navigate = useNavigate()
  const isPaused = useVoiceStore(isVoicePaused)
  const setWindowFocused = useVoiceStore((state) => state.setWindowFocused)
  const lastWakeRef = useRef<{ text: string; at: number } | null>(null)

  const onTranscript = useCallback(
    (text: string) => {
      // While the window is focused, speech is dictation for the composer.
      if (useVoiceStore.getState().windowFocused) {
        useComposerStore.getState().append(text)
        return
      }

      // While hidden or unfocused, only wake phrases matter.
      if (!VOICE_WAKE_PATTERN.test(text)) return

      const normalized = normalizeText(text)
      const previous = lastWakeRef.current

      if (previous?.text === normalized && Date.now() - previous.at < VOICE_WAKE_DEDUPLICATION_MS) {
        return
      }

      lastWakeRef.current = { text: normalized, at: Date.now() }
      useVoiceStore.getState().resume()

      void (async () => {
        await window.api.windowControls.show()
        await navigate('/')
      })()
    },
    [navigate]
  )

  const wake = useWakeWord(onTranscript)
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
  }, [setWindowFocused])

  // Listening is always on while hidden/unfocused; the user only controls it
  // while the window is focused.
  useEffect(() => {
    if (isPaused) {
      stop()
    } else {
      void start()
    }
  }, [isPaused, start, stop])

  return <Outlet context={session} />
}
