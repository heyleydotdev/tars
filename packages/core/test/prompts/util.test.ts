import { describe, expect, it } from 'vitest'

import { fill } from '../../src/prompts/util'

describe('fill', () => {
  it('replaces every known placeholder', () => {
    expect(fill('Hello {{name}}, meet {{name}}.', { name: 'Ada' })).toBe('Hello Ada, meet Ada.')
  })

  it('replaces missing values with an empty string', () => {
    expect(fill('Incident: {{title}} ({{id}})', { title: 'Checkout' })).toBe(
      'Incident: Checkout ()'
    )
  })

  it('leaves unknown placeholder shapes alone', () => {
    expect(fill('{{a-b}} {{ }} {{}}', {})).toBe('{{a-b}} {{ }} {{}}')
  })
})
