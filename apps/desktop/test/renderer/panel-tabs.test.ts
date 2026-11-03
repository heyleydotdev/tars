import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import { TabsContent } from '@tars/ui/components/tabs'

import PanelTabs from '../../src/renderer/src/components/panel-tabs'

describe('PanelTabs', () => {
  it('renders a trigger per item and the active panel', () => {
    const html = renderToStaticMarkup(
      createElement(PanelTabs, {
        defaultValue: 'preview',
        items: [
          { value: 'preview', label: 'Preview' },
          { value: 'code', label: 'Code' }
        ],
        children: createElement(TabsContent, { value: 'preview' }, 'Panel')
      })
    )

    expect(html).toContain('role="tab"')
    expect(html).toContain('Preview')
    expect(html).toContain('Code')
    expect(html).toContain('role="tabpanel"')
  })
})
