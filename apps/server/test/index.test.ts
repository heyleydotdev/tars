import { describe, expect, it } from 'bun:test'
import { exports } from 'cloudflare:workers'

import { ERRORS } from '@tars/core/errors'

const worker = exports.default

function request(path: string, init?: RequestInit): Promise<Response> {
  return worker.fetch(`http://example.com${path}`, init)
}

describe('routing', () => {
  it('returns 404 outside the api', async () => {
    const response = await request('/nope')

    expect(response.status).toBe(404)
    expect(await response.text()).toBe('Not Found')
  })
})

describe('websocket upgrades', () => {
  it('rejects a plain request without the upgrade header', async () => {
    const response = await request('/api/ws')

    expect(response.status).toBe(426)
    expect(await response.text()).toBe(ERRORS.websocketUpgradeRequired)
  })

  it('rejects an upgrade from an origin that is not trusted', async () => {
    const response = await request('/api/ws', {
      headers: { origin: 'https://evil.example', upgrade: 'websocket' }
    })

    expect(response.status).toBe(403)
    expect(await response.text()).toBe(ERRORS.forbidden)
  })
})

describe('request limits', () => {
  it('rejects auth bodies over one megabyte', async () => {
    const response = await request('/api/auth/sign-in/email', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: 'x'.repeat(1024 * 1024 + 1)
    })

    expect(response.status).toBe(413)
  })
})

describe('cors', () => {
  it('echoes a trusted origin with credentials', async () => {
    const response = await request('/api/rpc/incident/list', {
      method: 'OPTIONS',
      headers: {
        origin: 'http://localhost:3000',
        'access-control-request-method': 'POST'
      }
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBe('http://localhost:3000')
    expect(response.headers.get('access-control-allow-credentials')).toBe('true')
  })

  it('omits the allow-origin header for an untrusted origin', async () => {
    const response = await request('/api/rpc/incident/list', {
      method: 'OPTIONS',
      headers: { origin: 'https://evil.example' }
    })

    expect(response.status).toBe(204)
    expect(response.headers.get('access-control-allow-origin')).toBeNull()
  })
})
