import { describe, expect, it } from 'vitest'

import { previewDocument } from '../../src/renderer/src/lib/ui-preview'

describe('previewDocument', () => {
  it('injects the policy into an existing head', () => {
    const html = previewDocument('<html><head><title>x</title></head><body></body></html>')

    expect(html).toContain('Content-Security-Policy')
    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('</head>'))
  })

  it('adds the fixed-area overlay only when asked', () => {
    const plain = previewDocument('<html><head></head><body></body></html>')
    const marked = previewDocument('<html><head></head><body></body></html>', true)

    expect(plain).not.toContain('data-fix')
    expect(marked).toContain('[data-fix]')
    expect(marked).toContain('data-fix-why')
    expect(marked.indexOf('[data-fix]')).toBeLessThan(marked.indexOf('</head>'))
  })

  it('does not mistake a header for the head', () => {
    const html = previewDocument('<html><head></head><body><header>Title</header></body></html>')

    expect(html.indexOf('Content-Security-Policy')).toBeLessThan(html.indexOf('</head>'))
    expect(html).toContain('<header>Title</header>')
  })

  it('wraps a bare fragment', () => {
    const html = previewDocument('<main>ok</main>')

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('<main>ok</main>')
  })
})
