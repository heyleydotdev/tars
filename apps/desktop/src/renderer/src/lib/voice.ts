import { useEffect, useRef, useState } from 'react'

import {
  VOICE_CAPTURE_SETTINGS,
  VOICE_SAMPLE_RATE,
  VOICE_SEGMENT_DURATION_MS,
  VOICE_SPEECH_ACTIVE_RATIO,
  VOICE_SPEECH_FRAME_DURATION_MS,
  VOICE_SPEECH_RMS_THRESHOLD,
  VOICE_WAKE_DEDUPLICATION_MS,
  VOICE_WAKE_PATTERN
} from '@tars/core/constants'
import { ERRORS } from '@tars/core/errors'
import { normalizeText } from '@tars/core/utils/string'

type VoiceState = 'idle' | 'listening' | 'transcribing'

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
  const frameLength = Math.max(
    1,
    Math.round((VOICE_SAMPLE_RATE * VOICE_SPEECH_FRAME_DURATION_MS) / 1_000)
  )
  const frameCount = Math.ceil(samples.length / frameLength)
  let activeFrames = 0

  for (let frame = 0; frame < frameCount; frame += 1) {
    const start = frame * frameLength
    const end = Math.min(start + frameLength, samples.length)
    let energy = 0

    for (let index = start; index < end; index += 1) {
      const sample = samples[index] ?? 0
      energy += sample * sample
    }

    const length = end - start
    const rms = length > 0 ? Math.sqrt(energy / length) : 0

    if (rms >= VOICE_SPEECH_RMS_THRESHOLD) {
      activeFrames += 1
    }
  }

  return frameCount > 0 && activeFrames / frameCount >= VOICE_SPEECH_ACTIVE_RATIO
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
  const [state, setState] = useState<VoiceState>('idle')
  const [lastPhrase, setLastPhrase] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const lastWakeRef = useRef<{ text: string; at: number } | null>(null)
  const failedTranscriptionsRef = useRef(0)
  // Bumped on stop so a loop still awaiting a segment can tell it is stale.
  const sessionRef = useRef(0)

  const stop = (): void => {
    sessionRef.current += 1
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setState('idle')
  }

  const start = async (): Promise<void> => {
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
    setState('listening')

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

      let text: string | null = ''

      try {
        const decoded = await toWav(segment)

        if (!decoded.hasSpeech) {
          if (session === sessionRef.current) {
            setState('listening')
          }
          continue
        }

        setState('transcribing')
        text = await window.transcribeAudio(decoded.audio)
      } catch {
        // Audio decoding or the Worker can fail; keep the loop alive.
      }

      if (text === null) {
        failedTranscriptionsRef.current += 1

        if (failedTranscriptionsRef.current >= 2) {
          setError(ERRORS.transcriptionUnavailable)
        }

        if (session === sessionRef.current) {
          setState('listening')
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
            onWake(text)
          }
        }
      }

      if (session === sessionRef.current) {
        setState('listening')
      }
    }
  }

  useEffect(
    () => () => {
      sessionRef.current += 1
      streamRef.current?.getTracks().forEach((track) => track.stop())
      void decoder?.close()
      decoder = null
    },
    []
  )

  return { state, lastPhrase, error, start, stop }
}
