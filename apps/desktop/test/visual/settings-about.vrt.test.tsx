import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'

import SettingsAbout from '../../src/renderer/src/components/settings-about'

test('about models table', async () => {
  render(<SettingsAbout appInfo={{ version: '0.1.0', electron: '45.0.0', packaged: false }} />)

  await document.fonts.ready

  const table = page.getByRole('table').nth(1)

  await expect.element(table).toBeInTheDocument()
  await expect(table).toMatchScreenshot('about-models')
})
