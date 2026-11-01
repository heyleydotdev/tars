import { describe, expect, it } from 'vitest'

import type { SummaryData } from '../../src/services/summary'
import { buildSummaryPrompt } from '../../src/prompts/summary'

function data(overrides: Partial<SummaryData> = {}): SummaryData {
  return {
    period: 'week',
    from: new Date('2026-10-25T18:30:00.000Z'),
    to: new Date('2026-11-01T18:30:00.000Z'),
    label: 'Oct 26 – Nov 1',
    notes: [
      {
        occurredAt: '2026-10-27T10:00:00.000Z',
        title: 'Deploy day',
        content: 'Shipped the migration and watched the dashboards.',
        mood: 'calm'
      }
    ],
    counts: {
      notes: 1,
      tasksDone: 2,
      tasksOpen: 3,
      tasksDue: 1,
      remindersSent: 1,
      remindersPending: 0,
      incidentsOpened: 1,
      incidentsApproved: 1,
      measurements: 2
    },
    totals: [
      {
        currency: 'USD',
        totalCents: 8420,
        count: 3,
        categories: [
          { category: 'food', totalCents: 6000 },
          { category: 'transport', totalCents: 2420 }
        ]
      }
    ],
    incidentTitles: ['Checkout latency spike'],
    hasActivity: true,
    ...overrides
  }
}

describe('buildSummaryPrompt', () => {
  it('includes the period, counts, money, and notes', () => {
    const prompt = buildSummaryPrompt(data(), 'Asia/Kolkata')

    expect(prompt).toContain('Oct 26 – Nov 1')
    expect(prompt).toContain('2 completed, 3 open now, 1 due')
    expect(prompt).toContain('USD $84.20 across 3 expenses (food $60.00, transport $24.20)')
    expect(prompt).toContain('Deploy day')
    expect(prompt).toContain('Shipped the migration')
    expect(prompt).toContain('Checkout latency spike')
    expect(prompt).toContain('Output markdown only')
  })

  it('marks empty money and incidents', () => {
    const prompt = buildSummaryPrompt(
      data({
        totals: [],
        incidentTitles: [],
        counts: { ...data().counts, incidentsOpened: 0, incidentsApproved: 0 }
      })
    )

    expect(prompt).toContain('Money:\nnone')
    expect(prompt).toContain('Incident titles: none')
  })

  it('caps the note payload', () => {
    const notes = Array.from({ length: 40 }, (_, index) => ({
      occurredAt: '2026-10-27T10:00:00.000Z',
      title: `Note ${index}`,
      content: `sentinel-${index} ${'x'.repeat(600)}`,
      mood: null
    }))
    const prompt = buildSummaryPrompt(data({ notes }))

    expect(prompt).toContain('sentinel-0')
    expect(prompt).not.toContain('sentinel-39')
    expect(prompt.length).toBeLessThan(10_000)
  })
})
