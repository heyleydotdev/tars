import {
  VOICE_ANALYSER_POLL_MS,
  VOICE_MAX_SEGMENT_MS,
  VOICE_MIN_SEGMENT_MS,
  VOICE_SAMPLE_RATE,
  VOICE_SILENCE_DURATION_MS,
  VOICE_SPEECH_ACTIVE_RATIO,
  VOICE_SPEECH_FRAME_DURATION_MS,
  VOICE_SPEECH_RMS_THRESHOLD,
  VOICE_SPEECH_RMS_THRESHOLD_SQUARED
} from '@tars/core/constants'

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

  return { audio: encodeWav(samples), hasSpeech: containsSpeech(samples) }
}

export function closeAudioContext(): void {
  void audioContext?.close()
  audioContext = null
}
