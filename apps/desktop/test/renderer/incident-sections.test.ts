import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { describe, expect, it, vi } from 'vitest'

import Incident from '../../src/renderer/src/pages/incident'

const state = vi.hoisted(() => ({
  detail: {
    incident: {
      id: 'incident-1',
      title: 'Checkout latency',
      summary: null,
      status: 'open'
    },
    evidence: [{ id: 'evidence-1', status: 'ready' }],
    events: [],
    analysis: null
  }
}))

vi.mock('react-router', () => ({
  Link: () => null,
  useBlocker: () => ({ state: 'unblocked', reset: undefined, proceed: undefined }),
  useLoaderData: () => state.detail,
  useParams: () => ({ id: 'incident-1' })
}))

vi.mock('zustand/react/shallow', () => ({
  useShallow: (selector: unknown) => selector
}))

vi.mock('../../src/renderer/src/stores/incident-demo', () => ({
  useIncidentDemoStore: (
    selector: (state: {
      running: boolean
      done: number
      total: number
      incidentId: string | null
    }) => unknown
  ) => selector({ running: false, done: 0, total: 0, incidentId: null })
}))

vi.mock('../../src/renderer/src/lib/incident', () => ({
  useIncident: () => ({ data: state.detail })
}))

vi.mock('../../src/renderer/src/components/incident-evidence-panel', () => ({
  default: () => 'evidence-panel'
}))

vi.mock('../../src/renderer/src/components/incident-timeline', () => ({
  default: () => 'timeline-panel'
}))

vi.mock('../../src/renderer/src/components/incident-analysis-panel', () => ({
  default: () => 'postmortem-panel'
}))

describe('Incident sections', () => {
  it('keeps the postmortem section mounted but hidden', () => {
    const html = renderToStaticMarkup(createElement(Incident))
    const panels = [...html.matchAll(/<div[^>]*role="tabpanel"[^>]*>/g)].map((match) => match[0])

    expect(html).toContain('evidence-panel')
    expect(html).toContain('timeline-panel')
    expect(html).toContain('postmortem-panel')
    expect(panels).toHaveLength(2)
    expect(panels[0]).not.toContain('hidden')
    expect(panels[1]).toContain('hidden')
  })
})
