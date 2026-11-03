import { describe, expect, it } from 'vitest'

import { sanitizeUiCode } from '../../src/utils/ui-review'

describe('sanitizeUiCode', () => {
  it('unwraps a fenced document', () => {
    expect(sanitizeUiCode('```html\n<body>Hi</body>\n```')).toBe('<body>Hi</body>')
  })

  it('drops prose around the document', () => {
    const html = sanitizeUiCode('Here you go:\n<!doctype html><html><body>x</body></html>\nDone.')

    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html.endsWith('</html>')).toBe(true)
  })

  it('strips script tags', () => {
    expect(sanitizeUiCode('<div>ok</div><script>alert(1)</script>')).toBe('<div>ok</div>')
    expect(sanitizeUiCode('<script src="x.js" />')).toBe('')
  })
})
