import { createElement, createRef } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it } from 'vitest'

import BlueprintHierarchy from '../../src/renderer/src/components/blueprint-hierarchy'

function render(groups: Array<{ name: string; items: Array<string> }>): string {
  return renderToStaticMarkup(
    createElement(BlueprintHierarchy, {
      title: 'Booking app',
      data: { groups },
      svgRef: createRef<SVGSVGElement>()
    })
  )
}

describe('BlueprintHierarchy', () => {
  it('draws every group and its capabilities', () => {
    const html = render([
      { name: 'auth', items: ['Email login', 'Password reset'] },
      { name: 'payments', items: ['Card checkout'] }
    ])

    expect(html).toContain('viewBox')
    expect(html).toContain('AUTH')
    expect(html).toContain('PAYMENTS')
    expect(html).toContain('Email login')
    expect(html).toContain('Card checkout')
  })
})
