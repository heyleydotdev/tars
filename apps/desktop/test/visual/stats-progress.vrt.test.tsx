import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'

import StatsProgress from '../../src/renderer/src/components/stats-progress'

test('task ratio table', async () => {
  render(
    <div className="w-105 p-4">
      <StatsProgress
        openTasks={4}
        doneTasks={7}
        pendingReminders={2}
        sentReminders={1}
        dismissedReminders={0}
      />
    </div>
  )

  await document.fonts.ready

  await expect(page.getByRole('table')).toMatchScreenshot('task-ratio')
})
