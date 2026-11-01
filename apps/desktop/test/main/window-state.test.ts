import { describe, expect, it, mock } from 'bun:test'

const electron = {
  app: { getName: () => 'Tars', getPath: () => '/tmp', getVersion: () => '0.0.0' },
  screen: {
    getDisplayMatching: () => ({ workArea: { x: 0, y: 0, width: 1920, height: 1032 } })
  }
}

mock.module('electron', () => ({ default: electron, ...electron }))

const { fitToDisplay, MIN_WINDOW_HEIGHT, MIN_WINDOW_WIDTH } =
  await import('../../src/main/window-state')

describe('fitToDisplay', () => {
  it('keeps bounds that already fit', () => {
    expect(fitToDisplay({ x: 100, y: 80, width: 1280, height: 800 })).toEqual({
      x: 100,
      y: 80,
      width: 1280,
      height: 800
    })
  })

  it('slides an off-screen window back into the work area', () => {
    expect(fitToDisplay({ x: 1700, y: 900, width: 1280, height: 800 })).toEqual({
      x: 640,
      y: 232,
      width: 1280,
      height: 800
    })
  })

  it('shrinks bounds that are larger than the work area', () => {
    expect(fitToDisplay({ x: 100, y: 100, width: 2400, height: 1400 })).toEqual({
      x: 0,
      y: 0,
      width: 1920,
      height: 1032
    })
  })

  it('rejects bounds below the minimum window size', () => {
    expect(
      fitToDisplay({ x: 0, y: 0, width: MIN_WINDOW_WIDTH - 1, height: MIN_WINDOW_HEIGHT })
    ).toBeNull()
  })
})
