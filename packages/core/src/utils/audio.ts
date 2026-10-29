import {
  VOICE_SAMPLE_RATE,
  VOICE_SPEECH_ACTIVE_RATIO,
  VOICE_SPEECH_FRAME_DURATION_MS,
  VOICE_SPEECH_RMS_THRESHOLD
} from '../constants'

const SPEECH_RMS_THRESHOLD_SQUARED = VOICE_SPEECH_RMS_THRESHOLD ** 2

export function encodeWav(samples: Float32Array): ArrayBuffer {
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

export function hasSpeech(samples: Float32Array): boolean {
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

    if (energy >= SPEECH_RMS_THRESHOLD_SQUARED) {
      activeFrames += 1
      if (activeFrames >= requiredActive) return true
    }

    if (activeFrames + (frameCount - frame - 1) < requiredActive) return false
  }

  return activeFrames >= requiredActive
}
