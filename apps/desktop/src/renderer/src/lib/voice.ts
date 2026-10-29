import {
  VOICE_ANALYSER_POLL_MS,
  VOICE_MAX_SEGMENT_MS,
  VOICE_MIN_SEGMENT_MS,
  VOICE_SAMPLE_RATE,
  VOICE_SILENCE_DURATION_MS,
  VOICE_SPEECH_RMS_THRESHOLD
} from '@tars/core/constants'
import { hasSpeech as detectSpeech, encodeWav } from '@tars/core/utils/audio'

let audioContext: AudioContext | null = null

export async function recordSegment(stream: MediaStream): Promise<Blob> {
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

  audioContext ??= new AudioContext({ sampleRate: VOICE_SAMPLE_RATE })

  const source = audioContext.createMediaStreamSource(stream)
  const analyser = audioContext.createAnalyser()
  analyser.fftSize = 1024
  source.connect(analyser)

  const samples = new Float32Array(analyser.fftSize)
  const startedAt = performance.now()
  let silenceStartedAt: number | null = null

  recorder.start()

  await new Promise<void>((resolve) => {
    const tick = (): void => {
      analyser.getFloatTimeDomainData(samples)

      let sum = 0
      for (const sample of samples) {
        sum += sample * sample
      }

      const rms = Math.sqrt(sum / samples.length)
      const now = performance.now()
      const elapsed = now - startedAt

      if (rms >= VOICE_SPEECH_RMS_THRESHOLD) {
        silenceStartedAt = null
      } else if (silenceStartedAt === null) {
        silenceStartedAt = now
      }

      const silent =
        silenceStartedAt !== null && now - silenceStartedAt >= VOICE_SILENCE_DURATION_MS

      if (elapsed >= VOICE_MAX_SEGMENT_MS || (elapsed >= VOICE_MIN_SEGMENT_MS && silent)) {
        resolve()
        return
      }

      setTimeout(tick, VOICE_ANALYSER_POLL_MS)
    }

    tick()
  })

  source.disconnect()
  analyser.disconnect()

  recorder.stop()
  await stopped

  return new Blob(chunks, { type: recorder.mimeType || 'audio/webm' })
}

// Meta's ASR only takes mono 16-bit PCM WAV, so decode the recorder's webm
// segment and re-encode it at the model's native rate.
export async function toWav(blob: Blob): Promise<{ audio: ArrayBuffer; hasSpeech: boolean }> {
  audioContext ??= new AudioContext({ sampleRate: VOICE_SAMPLE_RATE })

  const audio = await audioContext.decodeAudioData(await blob.arrayBuffer())
  const channels = audio.numberOfChannels
  const samples = new Float32Array(audio.length)

  for (let channel = 0; channel < channels; channel += 1) {
    const data = audio.getChannelData(channel)

    for (let i = 0; i < data.length; i += 1) {
      samples[i] = (samples[i] ?? 0) + (data[i] ?? 0) / channels
    }
  }

  return { audio: encodeWav(samples), hasSpeech: detectSpeech(samples) }
}

export function closeAudioContext(): void {
  void audioContext?.close()
  audioContext = null
}
