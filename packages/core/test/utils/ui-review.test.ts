import { describe, expect, it } from 'vitest'

import { sanitizeUiCode } from '../../src/utils/ui-review'

describe('sanitizeUiCode', () => {
  it('unwraps a fenced document', () => {
    expect(sanitizeUiCode('```html\n<body>Hi</body>\n```')).toBe('<body>Hi</body>')
  })

  it('strips script tags', () => {
    expect(sanitizeUiCode('<div>ok</div><script>alert(1)</script>')).toBe('<div>ok</div>')
    expect(sanitizeUiCode('<script src="x.js" />')).toBe('')
  })
})
