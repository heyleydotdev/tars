import { CopyIcon, ExternalLinkIcon } from 'lucide-react'
import { useNavigate } from 'react-router'

import type { JournalItemOutput } from '@tars/core/schemas/journal'
import { ERRORS } from '@tars/core/errors'
import { activityIncidentId } from '@tars/core/utils/journal'
import { ContextMenuItem } from '@tars/ui/components/context-menu'

import { useShellAlertStore } from '../stores/alert'
import JournalRow from './journal-row'

export default function JournalActivityRow({ entry }: { entry: JournalItemOutput }) {
  const type = entry.tags.find((tag) => tag !== 'activity') ?? 'activity'
  const navigate = useNavigate()
  const showAlert = useShellAlertStore((state) => state.showAlert)
  const incidentId = activityIncidentId(entry.id)

  function copy(): void {
    const text = entry.title ? `${entry.title}: ${entry.content}` : entry.content

    void window.copyText(text).catch(() => {
      showAlert({
        title: ERRORS.copyFailedTitle,
        description: ERRORS.copyFailedDetail,
        variant: 'destructive'
      })
    })
  }

  return (
    <JournalRow
      entry={entry}
      menu={
        <>
          {incidentId ? (
            <ContextMenuItem onClick={() => navigate(`/incidents/${incidentId}`)}>
              <ExternalLinkIcon />
              Open incident
            </ContextMenuItem>
          ) : null}
          <ContextMenuItem onClick={copy}>
            <CopyIcon />
            Copy
          </ContextMenuItem>
        </>
      }
    >
      <div className="mb-1 flex flex-wrap items-center gap-x-2 gap-y-1">
        <span className="text-muted-foreground font-mono text-xs/6 uppercase">{type}</span>
        {entry.title ? (
          <span className="text-foreground text-xs/6 font-medium">{entry.title}</span>
        ) : null}
      </div>
      <p className="text-muted-foreground font-sans text-xs/6 wrap-break-word whitespace-pre-line select-text">
        {entry.content}
      </p>
    </JournalRow>
  )
}
