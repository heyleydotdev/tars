import { useCallback, useEffect, useRef } from 'react'

import { VOICE_CAPTURE_SETTINGS } from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'

import { closeAudioContext, recordSegment, toWav } from '../lib/voice'
import { useVoiceStore } from '../stores/voice'

export function useWakeWord(onTranscript: (text: string) => void) {
  const setError = useVoiceStore((state) => state.setError)
  const setTranscribing = useVoiceStore((state) => state.setTranscribing)
  const streamRef = useRef<MediaStream | null>(null)
  const failedTranscriptionsRef = useRef(0)
  const onTranscriptRef = useRef(onTranscript)
  // Bumped on stop so a loop still awaiting a segment can tell it is stale.
  const sessionRef = useRef(0)

  useEffect(() => {
    onTranscriptRef.current = onTranscript
  }, [onTranscript])

  const stop = useCallback((): void => {
    sessionRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setTranscribing(false)
  }, [setTranscribing])

  const start = useCallback(async (): Promise<void> => {
    if (streamRef.current) {
      return
    }

    setError(null)
    failedTranscriptionsRef.current = 0

    if (!(await window.requestMicrophoneAccess())) {
      setError(ERRORS.microphoneAccessDenied)
      return
    }

    let stream: MediaStream

    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: VOICE_CAPTURE_SETTINGS })
    } catch {
      setError(ERRORS.microphoneAccessDenied)
      return
    }

    streamRef.current = stream
    const session = sessionRef.current

    while (session === sessionRef.current) {
      let segment: Blob

      try {
        segment = await recordSegment(stream)
      } catch {
        stop()
        return
      }

      if (session !== sessionRef.current) {
        return
      }

      let text: string | null

      try {
        const decoded = await toWav(segment)

        if (!decoded.hasSpeech) {
          continue
        }

        setTranscribing(true)
        text = await window.transcribeAudio(decoded.audio)
      } catch {
        text = null
      } finally {
        setTranscribing(false)
      }

      if (session !== sessionRef.current) {
        return
      }

      if (text === null) {
        failedTranscriptionsRef.current += 1

        if (failedTranscriptionsRef.current >= 2) {
          setError(ERRORS.transcriptionUnavailable)
        }

        continue
      }

      failedTranscriptionsRef.current = 0
      setError(null)

      if (text) {
        onTranscriptRef.current(text)
      }
    }
  }, [setError, setTranscribing, stop])

  useEffect(
    () => () => {
      stop()
      closeAudioContext()
    },
    [stop]
  )

  return { start, stop }
}
