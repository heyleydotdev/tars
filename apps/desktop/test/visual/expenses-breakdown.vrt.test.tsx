import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'

import ExpensesBreakdown from '../../src/renderer/src/components/expenses-breakdown'

test('expenses breakdown table', async () => {
  render(
    <div className="w-160 p-4">
      <ExpensesBreakdown
        categories={[
          { label: 'food', amountCents: 4500, count: 3 },
          { label: 'bills', amountCents: 12000, count: 1 },
          { label: 'transport', amountCents: 2300, count: 2 }
        ]}
        totalCents={18800}
        currency="USD"
      />
    </div>
  )

  await document.fonts.ready

  await expect(page.getByRole('table')).toMatchScreenshot('expenses-breakdown')
})
