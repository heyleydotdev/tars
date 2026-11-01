import { env, exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

import { ERRORS } from '@tars/core/errors'
import { signFileKey } from '@tars/core/services/files'
import { signedFilePath } from '@tars/core/utils/files'

const worker = exports.default
const SECRET = 'file-secret-file-secret-file-secret-32'
const KEY = 'incident/user-test/incident-1/evidence-1.jpg'

function request(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(`http://example.com${path}`, init)
}

describe('file downloads', () => {
  it('rejects requests without a signature', async () => {
    const response = await request(`/api/files/${KEY}`)

    expect(response.status).toBe(403)
    expect(await response.text()).toBe(ERRORS.forbidden)
  })

  it('rejects a forged signature', async () => {
    const response = await request(`/api/files/${KEY}?sig=forged`)

    expect(response.status).toBe(403)
  })

  it('rejects keys outside the file layout', async () => {
    const response = await request('/api/files/incident/user-test/evidence-1.jpg?sig=x')

    expect(response.status).toBe(404)
  })

  it('serves a signed file with an immutable cache and revalidates', async () => {
    await env.FILES.put(KEY, new Uint8Array([1, 2, 3]), {
      httpMetadata: { contentType: 'image/png' }
    })
    const signature = await signFileKey(SECRET, KEY)
    const response = await request(signedFilePath(KEY, signature))
    const etag = response.headers.get('etag')

    expect(response.status).toBe(200)
    expect(response.headers.get('cache-control')).toBe('private, max-age=31536000, immutable')
    expect(response.headers.get('content-type')).toBe('image/png')
    expect(etag).toBeTruthy()

    const conditional = await request(signedFilePath(KEY, signature), {
      headers: { 'if-none-match': etag as string }
    })
    const wildcard = await request(signedFilePath(KEY, signature), {
      headers: { 'if-none-match': '*' }
    })

    expect(conditional.status).toBe(304)
    expect(wildcard.status).toBe(304)
  })

  it('returns 404 for a signed but missing file', async () => {
    const missing = 'incident/user-test/incident-1/missing.jpg'
    const signature = await signFileKey(SECRET, missing)
    const response = await request(signedFilePath(missing, signature))

    expect(response.status).toBe(404)
  })
})

describe('file uploads', () => {
  it('requires a session', async () => {
    const response = await request(`/api/files/${KEY}`, {
      method: 'POST',
      headers: { 'content-type': 'image/png' },
      body: new Uint8Array([1, 2, 3])
    })

    expect(response.status).toBe(401)
    expect(await response.text()).toBe(ERRORS.unauthorized)
  })
})

describe('file deletes', () => {
  it('requires a session', async () => {
    const response = await request(`/api/files/${KEY}`, { method: 'DELETE' })

    expect(response.status).toBe(401)
  })
})
