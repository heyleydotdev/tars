import { describe, expect, it } from 'bun:test'

import {
  capitalize,
  getInitials,
  normalizeText,
  safeRedirect,
  titleCase
} from '../../src/utils/string'

describe('capitalize', () => {
  it('uppercases only the first character', () => {
    expect(capitalize('tars')).toBe('Tars')
    expect(capitalize('TARS')).toBe('TARS')
    expect(capitalize('')).toBe('')
  })
})

describe('titleCase', () => {
  it('capitalizes words and words after a parenthesis', () => {
    expect(titleCase('hello world')).toBe('Hello World')
    expect(titleCase('hello (world)')).toBe('Hello (World)')
  })

  it('leaves hyphenated parts alone', () => {
    expect(titleCase('checkout-api')).toBe('Checkout-api')
  })
})

describe('getInitials', () => {
  it('takes the first two words', () => {
    expect(getInitials('Ada Lovelace')).toBe('AL')
    expect(getInitials('a b c')).toBe('AB')
  })

  it('falls back to U when there is no name', () => {
    expect(getInitials('')).toBe('U')
    expect(getInitials('   ')).toBe('U')
    expect(getInitials('tars')).toBe('T')
  })
})

describe('normalizeText', () => {
  it('lowercases, trims, and collapses separators', () => {
    expect(normalizeText('  Hello,   WÖRLD!  ')).toBe('hello wörld')
    expect(normalizeText('a---b___c')).toBe('a b c')
  })
})

describe('safeRedirect', () => {
  it('keeps local paths', () => {
    expect(safeRedirect('/journal')).toBe('/journal')
    expect(safeRedirect('/incidents/1?tab=timeline')).toBe('/incidents/1?tab=timeline')
  })

  it('rejects external and protocol-relative targets', () => {
    expect(safeRedirect(null)).toBe('/')
    expect(safeRedirect('')).toBe('/')
    expect(safeRedirect('//evil.example')).toBe('/')
    expect(safeRedirect('/\\evil.example')).toBe('/')
    expect(safeRedirect('https://evil.example')).toBe('/')
  })
})
