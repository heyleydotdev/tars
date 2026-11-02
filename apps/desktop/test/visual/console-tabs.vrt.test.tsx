import { useState } from 'react'
import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page, userEvent } from 'vitest/browser'

import { TabsContent } from '@tars/ui/components/tabs'

import ConsoleTabs from '../../src/renderer/src/components/console-tabs'

function SettingsTabs() {
  const [section, setSection] = useState('account')

  return (
    <div className="w-160 p-4">
      <ConsoleTabs
        value={section}
        onValueChange={setSection}
        items={[
          { value: 'account', label: 'Account' },
          { value: 'voice', label: 'Voice' },
          { value: 'about', label: 'About' }
        ]}
      >
        <TabsContent value="account">Account settings</TabsContent>
        <TabsContent value="voice">Voice settings</TabsContent>
        <TabsContent value="about">About panel</TabsContent>
      </ConsoleTabs>
    </div>
  )
}

test('console tabs', async () => {
  render(<SettingsTabs />)

  await document.fonts.ready

  await expect(page.getByRole('tablist')).toMatchScreenshot('console-tabs')
})

test('console tabs switch content', async () => {
  render(<SettingsTabs />)

  await expect.element(page.getByText('Account settings')).toBeInTheDocument()

  await userEvent.click(page.getByRole('tab', { name: 'Voice' }))
  await expect.element(page.getByText('Voice settings')).toBeInTheDocument()
  await expect.element(page.getByText('Account settings')).not.toBeInTheDocument()

  await userEvent.click(page.getByRole('tab', { name: 'About' }))
  await expect.element(page.getByText('About panel')).toBeInTheDocument()
})
