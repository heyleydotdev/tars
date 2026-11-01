import { describe, expect, it } from 'vitest'

import {
  fileApiPath,
  fileKey,
  fileKeyOwner,
  isFilePath,
  signedFilePath
} from '../../src/utils/files'

const KEY = 'incident/user-1/incident-1/evidence-1.jpg'

describe('file keys', () => {
  it('builds keys from scope, owner, parent and name', () => {
    expect(fileKey('incident', 'user-1', 'incident-1', 'evidence-1.jpg')).toBe(KEY)
    expect(fileKey('measure', 'user-1', 'run-1', 'item-1-thumb.jpg')).toBe(
      'measure/user-1/run-1/item-1-thumb.jpg'
    )
  })

  it('accepts image keys and rejects the rest', () => {
    expect(isFilePath(KEY)).toBe(true)
    expect(isFilePath('measure/user-1/run-1/item-1-thumb.webp')).toBe(true)
    expect(isFilePath('incident/user-1/incident-1/evidence-1.html')).toBe(false)
    expect(isFilePath('../user-1/incident-1/evidence-1.jpg')).toBe(false)
    expect(isFilePath('incident/user-1/evidence-1.jpg')).toBe(false)
  })

  it('reads the owner segment', () => {
    expect(fileKeyOwner(KEY)).toBe('user-1')
    expect(fileKeyOwner('nope')).toBeNull()
  })
})

describe('file urls', () => {
  it('builds the api path', () => {
    expect(fileApiPath(KEY)).toBe(`/api/files/${KEY}`)
  })

  it('appends the signature', () => {
    expect(signedFilePath(KEY, 'sig')).toBe(`/api/files/${KEY}?sig=sig`)
  })
})
