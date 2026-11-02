import { expect, test } from 'vitest'
import { render } from 'vitest-browser-react'
import { page } from 'vitest/browser'

import type { JournalItemOutput } from '@tars/core/schemas/journal'

import JournalNoteRow from '../../src/renderer/src/components/journal-note-row'

const entry: JournalItemOutput = {
  id: 'note-1',
  title: 'Shipping notes',
  content: 'A short note about the release.',
  mood: 'calm',
  tags: ['work', 'release'],
  occurredAt: '2026-11-02T09:00:00.000Z'
}

test('journal note badges', async () => {
  render(
    <div className="w-160 p-4">
      <ul>
        <JournalNoteRow entry={entry} onEdit={() => undefined} onDelete={() => undefined} />
      </ul>
    </div>
  )

  await document.fonts.ready

  await expect(page.getByRole('listitem')).toMatchScreenshot('notes-badges')
})
