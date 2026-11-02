import { describe, expect, it } from 'vitest'

import { isVoicePaused } from '../../src/renderer/src/stores/voice'

function state(windowFocused: boolean, userPaused: boolean, wakeEnabled: boolean) {
  return { windowFocused, userPaused, wakeEnabled } as Parameters<typeof isVoicePaused>[0]
}

describe('isVoicePaused', () => {
  it('uses the dictation toggle while focused', () => {
    expect(isVoicePaused(state(true, true, true))).toBe(true)
    expect(isVoicePaused(state(true, false, true))).toBe(false)
  })

  it('uses the wake preference while unfocused', () => {
    expect(isVoicePaused(state(false, true, false))).toBe(true)
    expect(isVoicePaused(state(false, true, true))).toBe(false)
  })
})
