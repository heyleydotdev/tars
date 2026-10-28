import { useCallback, useEffect, useRef, useState } from 'react'

import {
  VOICE_CAPTURE_SETTINGS,
  VOICE_SAMPLE_RATE,
  VOICE_SEGMENT_DURATION_MS,
  VOICE_SPEECH_ACTIVE_RATIO,
  VOICE_SPEECH_FRAME_DURATION_MS,
  VOICE_SPEECH_RMS_THRESHOLD_SQUARED,
  VOICE_WAKE_DEDUPLICATION_MS,
  VOICE_WAKE_PATTERN
} from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { normalizeText } from '@tars/core/utils/string'

async function recordSegment(stream: MediaStream): Promise<Blob> {
  const recorder = new MediaRecorder(stream)
  const chunks: Array<Blob> = []

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data)
    }
  }

  const stopped = new Promise<void>((resolve) => {
    recorder.onstop = () => resolve()
  })

  recorder.start()
  await new Promise((resolve) => setTimeout(resolve, VOICE_SEGMENT_DURATION_MS))
  recorder.stop()
  await stopped

  return new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
}

let decoder: AudioContext | null = null

function encodeWav(samples: Float32Array): ArrayBuffer {
  const buffer = new ArrayBuffer(44 + samples.length * 2)
  const view = new DataView(buffer)

  const writeAscii = (offset: number, value: string): void => {
    for (let i = 0; i < value.length; i += 1) {
      view.setUint8(offset + i, value.charCodeAt(i))
    }
  }

  writeAscii(0, 'RIFF')
  view.setUint32(4, 36 + samples.length * 2, true)
  writeAscii(8, 'WAVE')
  writeAscii(12, 'fmt ')
  view.setUint32(16, 16, true)
  view.setUint16(20, 1, true)
  view.setUint16(22, 1, true)
  view.setUint32(24, VOICE_SAMPLE_RATE, true)
  view.setUint32(28, VOICE_SAMPLE_RATE * 2, true)
  view.setUint16(32, 2, true)
  view.setUint16(34, 16, true)
  writeAscii(36, 'data')
  view.setUint32(40, samples.length * 2, true)

  for (let i = 0; i < samples.length; i += 1) {
    const sample = Math.max(-1, Math.min(1, samples[i] ?? 0))
    view.setInt16(44 + i * 2, sample * (sample < 0 ? 0x8000 : 0x7fff), true)
  }

  return buffer
}

function containsSpeech(samples: Float32Array): boolean {
  if (samples.length === 0) return false

  const frameLength = Math.max(
    1,
    Math.round((VOICE_SAMPLE_RATE * VOICE_SPEECH_FRAME_DURATION_MS) / 1_000)
  )

  const fullFrames = Math.floor(samples.length / frameLength)
  const remainder = samples.length - fullFrames * frameLength
  const frameCount = Math.max(1, fullFrames + (remainder >= frameLength / 2 ? 1 : 0))

  const requiredActive = Math.ceil(frameCount * VOICE_SPEECH_ACTIVE_RATIO - 1e-9)
  let activeFrames = 0

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * frameLength
    const end = Math.min(start + frameLength, samples.length)
    const length = end - start

    let sum = 0
    let sumSquares = 0
    for (let index = start; index < end; index += 1) {
      const sample = samples[index] ?? 0
      sum += sample
      sumSquares += sample * sample
    }

    const mean = sum / length
    const energy = Math.max(0, sumSquares / length - mean * mean)

    if (energy >= VOICE_SPEECH_RMS_THRESHOLD_SQUARED) {
      activeFrames += 1
      if (activeFrames >= requiredActive) return true
    }

    if (activeFrames + (frameCount - frame - 1) < requiredActive) return false
  }

  return activeFrames >= requiredActive
}

// Meta's ASR only takes mono 16-bit PCM WAV, so decode the recorder's webm
// segment and re-encode it at the model's native rate.
async function toWav(blob: Blob): Promise<{ audio: ArrayBuffer; hasSpeech: boolean }> {
  decoder ??= new AudioContext({ sampleRate: VOICE_SAMPLE_RATE })

  const audio = await decoder.decodeAudioData(await blob.arrayBuffer())
  const channels = audio.numberOfChannels
  const samples = new Float32Array(audio.length)

  for (let channel = 0; channel < channels; channel += 1) {
    const data = audio.getChannelData(channel)

    for (let i = 0; i < data.length; i += 1) {
      samples[i] = (samples[i] ?? 0) + (data[i] ?? 0) / channels
    }
  }

  return { audio: encodeWav(samples), hasSpeech: containsSpeech(samples) }
}

export function useWakeWord(onWake: (phrase: string) => void) {
  const [lastPhrase, setLastPhrase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isTranscribing, setIsTranscribing] = useState(false)
  const streamRef = useRef<MediaStream | null>(null)
  const lastWakeRef = useRef<{ text: string; at: number } | null>(null)
  const failedTranscriptionsRef = useRef(0)
  const onWakeRef = useRef(onWake)
  // Bumped on stop so a loop still awaiting a segment can tell it is stale.
  const sessionRef = useRef(0)

  useEffect(() => {
    onWakeRef.current = onWake
  }, [onWake])

  const stop = useCallback((): void => {
    sessionRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsTranscribing(false)
  }, [])

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

        setIsTranscribing(true)
        text = await window.transcribeAudio(decoded.audio)
      } catch {
        text = null
      } finally {
        setIsTranscribing(false)
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
        setLastPhrase(text)

        if (VOICE_WAKE_PATTERN.test(text)) {
          const normalized = normalizeText(text)
          const previous = lastWakeRef.current
          const isDuplicate =
            previous?.text === normalized && Date.now() - previous.at < VOICE_WAKE_DEDUPLICATION_MS

          if (!isDuplicate) {
            lastWakeRef.current = { text: normalized, at: Date.now() }
            onWakeRef.current(text)
          }
        }
      }
    }
  }, [stop])

  useEffect(
    () => () => {
      stop()
      void decoder?.close()
      decoder = null
    },
    [stop]
  )

  return { start, stop, lastPhrase, error, isTranscribing }
}
