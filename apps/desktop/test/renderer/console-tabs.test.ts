import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TabsContent } from '@tars/ui/components/tabs'

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
        ],
        children: createElement(TabsContent, { value: 'one' }, 'One panel')
      })
    )

    expect(html).toContain('role="tab"')
    expect(html).toContain('role="tabpanel"')
    expect(html).toContain('aria-selected="true"')
    expect(html).toContain('aria-selected="false"')
    expect(html).toContain('[2]')
  })
})
