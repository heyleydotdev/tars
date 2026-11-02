import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'

import ConsoleTabs from '../../src/renderer/src/components/console-tabs'

test('console tabs', async () => {
  render(
    <div className="w-160 p-4">
      <ConsoleTabs
        value="account"
        onValueChange={() => undefined}
        items={[
          { value: 'account', label: 'Account' },
          { value: 'voice', label: 'Voice' },
          { value: 'about', label: 'About' }
        ]}
      />
    </div>
  )

  await document.fonts.ready

  await expect(page.getByRole('tablist')).toMatchScreenshot('console-tabs')
})
