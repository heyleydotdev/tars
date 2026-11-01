import { describe, expect, it } from 'vitest'

import { signFileKey, verifyFileKey } from '../../src/services/files'

const SECRET = 'test-secret-test-secret-test-secret-32'
const KEY = 'incident/user-1/incident-1/evidence-1.jpg'

describe('file signatures', () => {
  it('signs and verifies a key', async () => {
    const signature = await signFileKey(SECRET, KEY)

    expect(await verifyFileKey(SECRET, KEY, signature)).toBe(true)
    expect(
      await verifyFileKey(SECRET, 'incident/user-1/incident-1/evidence-2.jpg', signature)
    ).toBe(false)
    expect(await verifyFileKey('other-secret', KEY, signature)).toBe(false)
  })

  it('rejects malformed signatures', async () => {
    expect(await verifyFileKey(SECRET, KEY, 'not-base64')).toBe(false)
    expect(await verifyFileKey(SECRET, KEY, 'abc')).toBe(false)
  })
})
