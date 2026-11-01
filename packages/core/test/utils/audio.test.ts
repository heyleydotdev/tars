import { describe, expect, it } from 'vitest'

import { VOICE_SAMPLE_RATE } from '../../src/constants'
import { encodeWav, hasSpeech } from '../../src/utils/audio'

function ascii(view: DataView, offset: number, length: number): string {
  return Array.from({ length }, (_, index) =>
    String.fromCharCode(view.getUint8(offset + index))
  ).join('')
}

describe('encodeWav', () => {
  it('writes a mono 16-bit pcm header', () => {
    const buffer = encodeWav(new Float32Array([0, 0.5, -0.5, 2, -2]))
    const view = new DataView(buffer)

    expect(buffer.byteLength).toBe(44 + 5 * 2)
    expect(ascii(view, 0, 4)).toBe('RIFF')
    expect(view.getUint32(4, true)).toBe(36 + 5 * 2)
    expect(ascii(view, 8, 4)).toBe('WAVE')
    expect(ascii(view, 12, 4)).toBe('fmt ')
    expect(view.getUint16(20, true)).toBe(1)
    expect(view.getUint16(22, true)).toBe(1)
    expect(view.getUint32(24, true)).toBe(VOICE_SAMPLE_RATE)
    expect(view.getUint16(34, true)).toBe(16)
    expect(ascii(view, 36, 4)).toBe('data')
    expect(view.getUint32(40, true)).toBe(5 * 2)
  })

  it('clamps samples into the 16-bit range', () => {
    const view = new DataView(encodeWav(new Float32Array([0, 0.5, -0.5, 2, -2])))

    expect(view.getInt16(44, true)).toBe(0)
    expect(view.getInt16(46, true)).toBe(16383)
    expect(view.getInt16(48, true)).toBe(-16384)
    expect(view.getInt16(50, true)).toBe(32767)
    expect(view.getInt16(52, true)).toBe(-32768)
  })
})

describe('hasSpeech', () => {
  const frame = (VOICE_SAMPLE_RATE * 20) / 1000

  it('returns false for empty or silent audio', () => {
    expect(hasSpeech(new Float32Array())).toBe(false)
    expect(hasSpeech(new Float32Array(frame * 20))).toBe(false)
  })

  it('returns true when enough frames carry energy', () => {
    const samples = new Float32Array(frame * 20)

    for (let index = 0; index < samples.length; index += 1) {
      samples[index] = index % 2 === 0 ? 0.5 : -0.5
    }

    expect(hasSpeech(samples)).toBe(true)
  })

  it('ignores a single loud frame in a long silence', () => {
    const samples = new Float32Array(frame * 20)

    for (let index = 0; index < frame; index += 1) {
      samples[index] = index % 2 === 0 ? 0.5 : -0.5
    }

    expect(hasSpeech(samples)).toBe(false)
  })
})
