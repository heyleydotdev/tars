import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import ConsoleTabs from '../../src/renderer/src/components/console-tabs'

describe('ConsoleTabs', () => {
  it('marks the selected section tab', () => {
    const html = renderToStaticMarkup(
      createElement(ConsoleTabs, {
        value: 'one',
        onValueChange: () => undefined,
        items: [
          { value: 'one', label: 'One' },
          { value: 'two', label: 'Two', count: 2 }
        ]
      })
    )

    expect(html).toContain('role="tab"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-selected="false"')
    expect(html).toContain('[2]')
  })
})
