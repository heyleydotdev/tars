import { describe, expect, it } from 'vitest'

import { groupByDay } from '../../src/renderer/src/lib/group-by-day'

describe('groupByDay', () => {
  it('groups adjacent items with the same day', () => {
    const items = [
      { id: 'a', day: '2026-11-03' },
      { id: 'b', day: '2026-11-03' },
      { id: 'c', day: '2026-11-02' }
    ]

    const groups = groupByDay(items, (item) => item.day)

    expect(groups.map((group) => [group.key, group.items.length])).toEqual([
      ['2026-11-03', 2],
      ['2026-11-02', 1]
    ])
    expect(groups[0]?.label).toBe('2026-11-03')
  })
})
