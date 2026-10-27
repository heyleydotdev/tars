import { exports } from 'cloudflare:workers'
import { describe, expect, it } from 'vitest'

const worker = (path: string) => exports.default.fetch(`https://example.com${path}`)

describe('server worker', () => {
  it('serves the health check', async () => {
    const response = await worker('/health')

    expect(response.status).toBe(200)
    expect(await response.json()).toEqual({ ok: true })
  })

  it('404s unknown paths', async () => {
    expect((await worker('/')).status).toBe(404)
  })
})
