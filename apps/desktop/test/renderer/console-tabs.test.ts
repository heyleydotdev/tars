import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ConsoleTabs from '../../src/renderer/src/components/console-tabs'

describe('ConsoleTabs', () => {
  it('marks the selected section button as pressed', () => {
    const html = renderToStaticMarkup(
      createElement(ConsoleTabs, {
        value: 'one',
        items: [
          { value: 'one', label: 'One' },
          { value: 'two', label: 'Two', count: 2 }
        ]
      })
    )

    expect(html).toContain('aria-pressed="true"')
    expect(html).toContain('aria-pressed="false"')
    expect(html).toContain('[2]')
  })
})
