import { describe, expect, it } from 'vitest'

import { previewDocument } from '../../src/renderer/src/lib/ui-preview'

describe('previewDocument', () => {
  it('injects the policy into an existing head', () => {
    const html = previewDocument('<html><head><title>x</title></head><body></body></html>')

    expect(html).toContain('Content-Security-Policy')
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('</head>'))
  })

  it('wraps a bare fragment', () => {
    const html = previewDocument('<main>ok</main>')

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<main>ok</main>')
  })
})
