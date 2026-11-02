import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import type { BlueprintFlowOutput } from '@tars/core/schemas/blueprint'

import BlueprintFlowchart from '../../src/renderer/src/components/blueprint-flowchart'

function render(steps: BlueprintFlowOutput['steps']): string {
  return renderToStaticMarkup(
    createElement(BlueprintFlowchart, {
      data: { steps },
      svgRef: createRef<SVGSVGElement>()
    })
  )
}

describe('BlueprintFlowchart', () => {
  it('chains the steps with an arrow between each pair', () => {
    const html = render([
      { label: 'Landing page', detail: 'Visitor opens the site.', kind: 'entry' },
      { label: 'Choose a slot', detail: 'Visitor picks a time.', kind: 'screen' },
      { label: 'Card checkout', detail: 'Payment is taken.', kind: 'screen' },
      { label: 'Confirmation', detail: 'Booking is confirmed.', kind: 'outcome' }
    ])

    expect(html).toContain('viewBox')
    expect(html).toContain('Landing page')
    expect(html).toContain('Visitor picks a time.')
    expect(html.match(/marker-end/g)).toHaveLength(3)
  })
})
